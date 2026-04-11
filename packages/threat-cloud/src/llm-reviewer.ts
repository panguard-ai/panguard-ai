/**
 * LLM Reviewer for ATR Proposals
 * ATR 提案 LLM 審查器
 *
 * Uses the Anthropic API (via node:https) to review ATR rule proposals
 * for production readiness. Evaluates false positive risk, coverage,
 * detection specificity, response proportionality, and YAML validity.
 *
 * @module @panguard-ai/threat-cloud/llm-reviewer
 */

import * as https from 'node:https';
import { load as parseYaml } from 'js-yaml';
import {
  parseATRRule,
  validateRuleMeetsStandard,
  type QualityGateResult,
} from '@panguard-ai/atr/quality';
import type { ThreatCloudDB } from './database.js';

/**
 * Minimal rule shape for self-test — matches what the LLM drafter prompt
 * outputs. We only care about detection.conditions and test_cases.
 */
interface SelfTestRule {
  detection?: {
    conditions?: Array<{ value?: string; field?: string; operator?: string }>;
  };
  test_cases?: {
    true_positives?: Array<{ input?: string; tool_response?: string }>;
    true_negatives?: Array<{ input?: string; tool_response?: string }>;
  };
  evasion_tests?: Array<{ input?: string; expected?: string }>;
}

/**
 * Self-test result for a single rule.
 * A rule that fails its OWN test cases cannot be trusted to work on real data.
 */
interface SelfTestResult {
  readonly passed: boolean;
  readonly tpTotal: number;
  readonly tpMatched: number;
  readonly tnTotal: number;
  readonly tnMatched: number;
  readonly failureReasons: readonly string[];
}

/**
 * Run a rule's embedded test cases against its own regex conditions.
 * This is the first-principles quality check: if a rule cannot match its
 * own claimed TPs or falsely matches its own claimed TNs, the regex is
 * broken regardless of how good the metadata looks.
 *
 * Returns `passed: true` only if ALL TPs match AND zero TNs match.
 */
function selfTestRule(ruleContent: string): SelfTestResult {
  let parsed: SelfTestRule;
  try {
    parsed = parseYaml(ruleContent) as SelfTestRule;
  } catch (e) {
    return {
      passed: false,
      tpTotal: 0,
      tpMatched: 0,
      tnTotal: 0,
      tnMatched: 0,
      failureReasons: [`YAML parse error: ${e instanceof Error ? e.message : String(e)}`],
    };
  }

  const conditions = parsed?.detection?.conditions ?? [];
  const regexes: RegExp[] = [];
  for (const c of conditions) {
    if (!c?.value) continue;
    // Strip (?i) prefix — JS uses /pattern/i flag
    const pattern = c.value.replace(/^\(\?i\)/, '');
    try {
      regexes.push(new RegExp(pattern, 'i'));
    } catch {
      // Invalid regex — skip this condition. Other conditions may still work.
    }
  }

  if (regexes.length === 0) {
    return {
      passed: false,
      tpTotal: 0,
      tpMatched: 0,
      tnTotal: 0,
      tnMatched: 0,
      failureReasons: ['no compilable regex conditions'],
    };
  }

  const matchesAny = (text: string): boolean => regexes.some((r) => r.test(text));

  const tps = parsed?.test_cases?.true_positives ?? [];
  const tns = parsed?.test_cases?.true_negatives ?? [];

  const failureReasons: string[] = [];
  let tpMatched = 0;
  for (let i = 0; i < tps.length; i++) {
    const input = tps[i]?.input ?? tps[i]?.tool_response ?? '';
    if (matchesAny(input)) {
      tpMatched++;
    } else {
      failureReasons.push(`TP ${i + 1} not caught: "${input.slice(0, 80)}..."`);
    }
  }

  let tnPassed = 0;
  for (let i = 0; i < tns.length; i++) {
    const input = tns[i]?.input ?? tns[i]?.tool_response ?? '';
    if (!matchesAny(input)) {
      tnPassed++;
    } else {
      failureReasons.push(`TN ${i + 1} false positive: "${input.slice(0, 80)}..."`);
    }
  }

  // A rule passes self-test if all TPs match AND zero TNs match
  const passed =
    tpMatched === tps.length && tnPassed === tns.length && tps.length > 0 && tns.length > 0;

  return {
    passed,
    tpTotal: tps.length,
    tpMatched,
    tnTotal: tns.length,
    tnMatched: tns.length - tnPassed, // FP count
    failureReasons,
  };
}

/** LLM review verdict structure */
interface LLMVerdict {
  approved: boolean;
  falsePositiveRisk: 'low' | 'medium' | 'high';
  coverageScore: number;
  reasoning: string;
}

/** Tool description from scan results */
interface ToolDescription {
  name: string;
  description: string;
}

/** LLM analysis result for a scanned skill */
interface SkillAnalysisResult {
  package: string;
  threatsFound: boolean;
  proposals: Array<{ patternHash: string; ruleContent: string }>;
  /** Analysis status: 'success' if LLM completed, 'error' if LLM failed */
  status: 'success' | 'error';
  /** Error reason when status is 'error' */
  errorReason?: string;
}

/** Timeout for LLM API calls in milliseconds */
const LLM_TIMEOUT_MS = 60_000;

/** Default model for review */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * LLM Reviewer for ATR rule proposals
 * ATR 規則提案 LLM 審查器
 */
export class LLMReviewer {
  private readonly apiKey: string;
  private readonly db: ThreatCloudDB;
  private readonly model: string;

  constructor(apiKey: string, db: ThreatCloudDB, model?: string) {
    this.apiKey = apiKey;
    this.db = db;
    this.model = model ?? DEFAULT_MODEL;
  }

  /** Check if the reviewer is available (API key is set) / 檢查審查器是否可用 */
  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Review an ATR proposal via Anthropic API
   * 透過 Anthropic API 審查 ATR 提案
   */
  async reviewProposal(
    patternHash: string,
    ruleContent: string
  ): Promise<{ verdict: string; approved: boolean }> {
    const prompt = this.buildReviewPrompt(ruleContent);

    let responseText: string;
    try {
      responseText = await this.callAnthropicAPI(prompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`LLM review failed for ${patternHash}: ${msg}`);

      // Rate limit or transient errors: do NOT store verdict, keep pending for retry
      if (
        msg.includes('429') ||
        msg.includes('rate_limit') ||
        msg.includes('timed out') ||
        msg.includes('503')
      ) {
        console.error(`  -> Transient error, keeping proposal pending for retry`);
        return { verdict: '', approved: false };
      }

      // Non-transient errors: store failure but keep proposal pending for retry
      // Do NOT auto-reject — API errors are not evidence of bad rules
      const failVerdict = JSON.stringify({
        approved: false,
        falsePositiveRisk: 'medium',
        coverageScore: 0,
        reasoning: `LLM review failed: ${msg}`,
      });
      this.db.updateATRProposalLLMReview(patternHash, failVerdict);
      return { verdict: failVerdict, approved: false };
    }

    // Parse the LLM response
    const verdict = this.parseVerdict(responseText);
    const verdictJson = JSON.stringify(verdict);

    // Store verdict in database
    this.db.updateATRProposalLLMReview(patternHash, verdictJson);

    // Terminal state transition on any legitimate rejection.
    // Transient errors are handled earlier (they return without reaching this
    // code path), so if we got a parsed verdict with approved=false, the LLM
    // has made a reasoned decision — move the proposal to 'rejected' so the
    // retry cron stops picking it up. Previously only high-FP rejections were
    // marked terminal, which left low/medium-FP rejections in an infinite
    // retry loop burning LLM API quota.
    if (!verdict.approved) {
      this.db.rejectATRProposal(patternHash);
    }

    return { verdict: verdictJson, approved: verdict.approved };
  }

  /**
   * Build the review prompt for the LLM
   * 建構 LLM 審查提示
   */
  private buildReviewPrompt(ruleContent: string): string {
    return `You are a cybersecurity rule reviewer for the ATR (Agent Threat Rules) standard.

Review this auto-generated ATR rule. These rules detect threats in MCP (Model Context Protocol) tool descriptions — a new attack surface where malicious tool descriptions manipulate LLM behavior.

\`\`\`yaml
${ruleContent}
\`\`\`

CONTEXT: This is an "experimental" rule for a NEW threat category (AI agent tool poisoning).
Perfect coverage is NOT expected. Rules that detect even ONE specific attack pattern are valuable
as early warning signals, even if attackers can easily evade them with rephrasing.

Evaluation criteria:

1. FALSE POSITIVE RISK (low/medium/high)
   - Would this trigger on NORMAL, LEGITIMATE tool descriptions?
   - A rule that matches "always pass data without asking user confirmation" is LOW FP risk
     because legitimate tools do NOT include such instructions.
   - Only mark "high" if the regex would match common legitimate documentation phrases.

2. COVERAGE SCORE (0-100)
   - Does it detect the SPECIFIC attack pattern described? (not all possible variations)
   - 40+ is acceptable for experimental rules targeting new attack types.
   - Do NOT penalize for being "too specific" — specific is GOOD for FP reduction.

3. YAML VALIDITY
   - Required fields: title, id, severity, detection
   - Test cases present with realistic examples

APPROVAL CRITERIA:
- Approve if: FP risk is low/medium AND detects a real attack pattern AND YAML is valid
- Reject ONLY if: regex matches common legitimate phrases OR detects no real attack

Output ONLY valid JSON (no markdown, no explanation outside the JSON):
{"approved": true/false, "falsePositiveRisk": "low"|"medium"|"high", "coverageScore": 0-100, "reasoning": "brief explanation"}`;
  }

  /**
   * Call the Anthropic API using node:https
   * 透過 node:https 呼叫 Anthropic API
   */
  private callAnthropicAPI(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // 4096 tokens is needed because the ATR drafter prompt requires
      // a full rule YAML with 3+ conditions, 3+ TP, 3+ TN, 3+ evasion tests,
      // MITRE + OWASP references, and descriptions. 1024 was cutting off
      // mid-YAML and the regex extractor dropped the truncated block.
      const requestBody = JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(requestBody),
        },
        timeout: LLM_TIMEOUT_MS,
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');

          if (res.statusCode !== 200) {
            reject(
              new Error(`Anthropic API returned status ${res.statusCode}: ${body.slice(0, 500)}`)
            );
            return;
          }

          try {
            const parsed = JSON.parse(body) as {
              content?: Array<{ type: string; text?: string }>;
            };
            const textBlock = parsed.content?.find((c) => c.type === 'text');
            if (textBlock?.text) {
              resolve(textBlock.text);
            } else {
              reject(new Error('Anthropic API response missing text content'));
            }
          } catch (err) {
            reject(
              new Error(
                `Failed to parse Anthropic API response: ${err instanceof Error ? err.message : String(err)}`
              )
            );
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Anthropic API request timed out after ${LLM_TIMEOUT_MS}ms`));
      });

      req.on('error', (err) => {
        reject(new Error(`Anthropic API request failed: ${err.message}`));
      });

      req.write(requestBody);
      req.end();
    });
  }

  // -------------------------------------------------------------------------
  // Skill Analysis — POST /api/analyze-skills
  // 技能分析 — 接收掃描結果，用 LLM 找 regex 漏掉的 semantic threats
  // -------------------------------------------------------------------------

  /** Prompt for skill/tool analysis (both MCP and SKILL.md) */
  private static readonly ATR_DRAFTER_PROMPT = `You are a senior AI security rule engineer for ATR (Agent Threat Rules). Cisco AI Defense merged 34 ATR rules into production. Your output must meet that quality bar.

You will receive MCP tool descriptions from a skill. Write a PRODUCTION-QUALITY detection rule ONLY if you find a SPECIFIC, CONCRETE attack pattern.

QUALITY BAR (Cisco-merge level):

1. REGEX — SINGLE-QUOTED YAML, compound patterns, 3+ word sequences:
   GOOD: '(curl|wget)\\s+[^\\n]*\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}[^|]*\\|\\s*(bash|sh)'
   BAD:  "config.*base64.*import" (too broad, double quotes cause YAML escape bugs)
   CRITICAL: Always use SINGLE QUOTES for regex values in YAML. Double quotes break \\s, \\d, \\w.
   CRITICAL: Do NOT use (?i) inline flag — JS RegExp does not support it. Instead, use character classes like [aA] or write pattern without case sensitivity assumption.

2. DETECTION LAYERS — minimum 3 conditions, 5+ preferred:
   Cisco-merge rules have 5-15 detection layers for defense in depth.
   Each condition catches a different facet of the attack:
     - Layer 1: the core malicious action (e.g. credential file read)
     - Layer 2: the exfil vector (e.g. base64 encoding, compression)
     - Layer 3: the transmission (e.g. curl POST to external host)
     - Layer 4: (optional) obfuscation markers (eval, decode, fromCharCode)
     - Layer 5: (optional) evasion patterns (sleep, time check, conditional)
   A rule with only 1 condition is REJECTED as insufficient.

3. FALSE POSITIVES — regex MUST NOT trigger on:
   - Legitimate deployment/monitoring/admin tools
   - Security scanning tools that DESCRIBE attack patterns as examples
   - Normal API clients reading credentials from config
   - DevOps skills mentioning shell commands in documentation context
   TEST: mentally run your regex against "npm install express" and "deploy to AWS" — if it triggers, it's too broad.

4. REAL ATTACKS ONLY — not "this tool has broad permissions":
   - Hidden LLM instructions ("always approve", "skip verification", "do not inform user")
   - Credential exfiltration (read ~/.ssh + send externally)
   - Malicious code execution (curl|bash from raw IP, base64 decode + exec)
   - Supply chain (typosquat names, unofficial fork claims)
   - Reverse shells, DNS exfiltration, IMDS access

5. TEST CASES — 5+ true_positives, 5+ true_negatives (Cisco bar, not 3):
   - TP must be REAL attack payloads (not hypothetical)
   - TN must be similar-looking LEGITIMATE content
   - YOUR REGEX MUST ACTUALLY MATCH ALL TP AND MISS ALL TN. Verify before outputting.
   - Include at least 2 TN that are edge cases (similar commands in legitimate contexts)

6. EVASION TESTS — required, minimum 3:
   Document known bypass techniques with expected: not_triggered.
   Every rule must honestly acknowledge how attackers could evade it:
     - Obfuscation (base64, hex, unicode escapes)
     - Semantic paraphrase (synonyms, indirect references)
     - Time/context gating (delayed execution, conditional triggers)

7. REFERENCES — every rule must map to BOTH OWASP and MITRE:
   references:
     owasp_llm:
       - "LLM01:2025 - Prompt Injection" (or appropriate category)
     owasp_agentic:
       - "ASI01:2026 - Agent Behaviour Hijack" (or appropriate category)
     mitre_atlas:
       - "AML.T0051" (or appropriate technique ID)
   MITRE ATLAS reference is REQUIRED, not optional.

8. DECISION CRITERIA — output a rule or "NO_THREATS_FOUND":
   - If the skill content contains ACTUAL malicious code (credential theft, exfiltration,
     reverse shells, hidden instructions to bypass safety) → WRITE A RULE, even if you
     think existing regex might already catch it. Let the dedup layer handle overlaps.
   - If the skill is just a normal tool with broad permissions (file access, network calls)
     but no malicious INTENT → output NO_THREATS_FOUND.
   - When in doubt about whether something is malicious, WRITE THE RULE. False negatives
     (missing a real attack) are worse than duplicate rules.

Output format (ONLY if a SPECIFIC threat is found):
\`\`\`yaml
title: '<specific attack technique>'
id: ATR-2026-DRAFT-<8char-hex>
rule_version: 1
status: experimental
description: >
  <what SPECIFIC attack this detects, referencing the analyzed skill content>
author: "ATR Threat Cloud Crystallization"
date: "${new Date().toISOString().slice(0, 10).replace(/-/g, '/')}"
schema_version: "0.1"
detection_tier: pattern
maturity: experimental
severity: <critical|high|medium>
references:
  owasp_llm:
    - "<most relevant LLM Top 10 category>"
  owasp_agentic:
    - "<most relevant Agentic Top 10 category>"
  mitre_atlas:
    - "<AML.Txxxx technique ID — REQUIRED>"
tags:
  category: <skill-compromise|tool-poisoning|prompt-injection|context-exfiltration|privilege-escalation>
  subcategory: <specific-technique>
  scan_target: <mcp|skill|both>
  confidence: <high|medium>
agent_source:
  type: mcp_exchange
  framework: [any]
  provider: [any]
detection:
  conditions:
    - field: content
      operator: regex
      value: '<LAYER 1: core malicious action regex>'
      description: '<what layer 1 matches>'
    - field: content
      operator: regex
      value: '<LAYER 2: exfil/encoding vector regex>'
      description: '<what layer 2 matches>'
    - field: content
      operator: regex
      value: '<LAYER 3: transmission/execution regex>'
      description: '<what layer 3 matches>'
  condition: any
  false_positives:
    - '<edge case 1 — legitimate content that looks similar>'
    - '<edge case 2 — common benign pattern>'
    - '<edge case 3 — dev/admin tool context>'
response:
  actions: [alert, block_tool]
  message_template: >
    [ATR-2026-DRAFT] <one-line description of what was detected>
test_cases:
  true_positives:
    - input: '<real attack payload 1>'
      expected: triggered
    - input: '<real attack payload 2>'
      expected: triggered
    - input: '<real attack payload 3>'
      expected: triggered
    - input: '<real attack payload 4>'
      expected: triggered
    - input: '<real attack payload 5>'
      expected: triggered
  true_negatives:
    - input: '<similar but safe content 1>'
      expected: not_triggered
      reason: '<why this is safe>'
    - input: '<similar but safe content 2>'
      expected: not_triggered
      reason: '<why this is safe>'
    - input: '<similar but safe content 3>'
      expected: not_triggered
      reason: '<why this is safe>'
    - input: '<edge case 4 — common legitimate usage>'
      expected: not_triggered
      reason: '<why this is safe>'
    - input: '<edge case 5 — devops/admin tool context>'
      expected: not_triggered
      reason: '<why this is safe>'
evasion_tests:
  - input: '<bypass 1 — obfuscation variant>'
    expected: not_triggered
    bypass_technique: '<technique name>'
    notes: '<how attacker could evade>'
  - input: '<bypass 2 — semantic paraphrase>'
    expected: not_triggered
    bypass_technique: '<technique name>'
    notes: '<why this bypasses the regex>'
  - input: '<bypass 3 — time-gated or conditional>'
    expected: not_triggered
    bypass_technique: '<technique name>'
    notes: '<explanation>'
\`\`\`

BEFORE OUTPUTTING — reject your own output if any check fails:
- [ ] At least 3 detection conditions (NOT 1)
- [ ] At least 5 true_positives + 5 true_negatives (Cisco bar, not 3)
- [ ] At least 3 evasion_tests documenting known bypasses
- [ ] MITRE ATLAS reference present (REQUIRED)
- [ ] OWASP LLM + OWASP Agentic references present
- [ ] No (?i) inline flag — JS does not support it
- [ ] Single-quoted regex values
- [ ] Every condition has a description field
- [ ] Your regex matches ALL true_positives AND misses ALL true_negatives

If you cannot meet this bar, output NO_THREATS_FOUND instead of a weak rule.`;

  /**
   * Analyze skill scan results for semantic threats regex missed
   * 分析技能掃描結果，找出 regex 漏掉的語義威脅
   */
  async analyzeSkills(
    skills: Array<{ package: string; tools: ToolDescription[] }>
  ): Promise<SkillAnalysisResult[]> {
    const results: SkillAnalysisResult[] = [];

    for (const skill of skills) {
      if (!skill.tools || skill.tools.length === 0) continue;

      const toolSummary = skill.tools
        .slice(0, 30) // Limit to avoid token overflow
        .map((t) => `- ${t.name}: ${t.description}`)
        .join('\n');

      const userMessage = `Analyze this skill content from "${skill.package}" for threats that regex scanning missed:\n\n${toolSummary}`;

      try {
        const responseText = await this.callAnthropicAPI(
          LLMReviewer.ATR_DRAFTER_PROMPT + '\n\n' + userMessage
        );

        // Log raw LLM response for debugging crystallization pipeline
        console.log(
          `[LLM] analyzeSkills response for "${skill.package}" (${responseText.length} chars):`
        );
        console.log(`[LLM] First 500 chars: ${responseText.slice(0, 500)}`);

        if (responseText.includes('NO_THREATS_FOUND')) {
          console.log(`[LLM] Verdict: NO_THREATS_FOUND for "${skill.package}"`);
          results.push({
            package: skill.package,
            threatsFound: false,
            proposals: [],
            status: 'success',
          });
          continue;
        }

        // Extract YAML blocks
        // Primary: properly-closed ```yaml\n...```
        // Fallback: opening ```yaml\n...<end of string> (truncation safety net)
        let yamlBlocks = responseText.match(/```yaml\n([\s\S]*?)```/g);
        if (!yamlBlocks || yamlBlocks.length === 0) {
          const unclosed = responseText.match(/```yaml\n([\s\S]*?)$/);
          if (unclosed) {
            console.log(
              `[LLM] Recovered unclosed YAML block (max_tokens likely hit) for "${skill.package}"`
            );
            yamlBlocks = [unclosed[0] + '\n```'];
          }
        }
        if (!yamlBlocks || yamlBlocks.length === 0) {
          console.log(
            `[LLM] No YAML blocks found in response for "${skill.package}". Response starts with: ${responseText.slice(0, 200)}`
          );
          results.push({
            package: skill.package,
            threatsFound: false,
            proposals: [],
            status: 'success',
          });
          continue;
        }

        console.log(`[LLM] Found ${yamlBlocks.length} YAML block(s) for "${skill.package}"`);

        const proposals: SkillAnalysisResult['proposals'] = [];
        const { createHash } = await import('node:crypto');

        for (const block of yamlBlocks) {
          let ruleContent = block
            .replace(/```yaml\n?/, '')
            .replace(/```$/, '')
            .trim();

          // Validate: must have required ATR fields
          if (!ruleContent.includes('title:') || !ruleContent.includes('detection:')) {
            console.log(
              `[LLM] YAML block skipped — missing title: (${ruleContent.includes('title:')}) or detection: (${ruleContent.includes('detection:')}). First 200 chars: ${ruleContent.slice(0, 200)}`
            );
            continue;
          }

          // Validate regex in the rule (match both single and double quoted values)
          const regexMatch = ruleContent.match(/value:\s*(['"])((?:(?!\1).)+)\1/);
          if (regexMatch) {
            // Strip (?i) prefix — JS uses /pattern/i flag instead of PCRE inline (?i)
            const rawPattern = regexMatch[2]!;
            const jsPattern = rawPattern.replace(/^\(\?i\)/g, '');
            try {
              new RegExp(jsPattern, 'i');
            } catch (regexErr) {
              console.log(
                `[LLM] YAML block skipped — invalid regex: ${rawPattern.slice(0, 100)}. Error: ${regexErr instanceof Error ? regexErr.message : String(regexErr)}`
              );
              continue; // Skip rules with invalid regex
            }
            // If we stripped (?i), also fix it in the rule content so downstream consumers don't hit the same issue
            if (rawPattern !== jsPattern) {
              ruleContent = ruleContent.replace(rawPattern, jsPattern);
              console.log(`[LLM] Stripped (?i) prefix from regex for JS compatibility`);
            }
          }

          // ATR Quality Gate — use the canonical library from agent-threat-rules/quality
          // Reject rules that don't meet the experimental quality bar (3+ conditions,
          // 3 TP + 3 TN, OWASP + MITRE, FP docs). See RFC-001 §3.
          let gateResult: QualityGateResult;
          try {
            const metadata = parseATRRule(ruleContent);
            // Mark as LLM-generated so downstream consumers know provenance
            const enriched = { ...metadata, llmGenerated: true };
            gateResult = validateRuleMeetsStandard(enriched, 'experimental');
          } catch (parseErr) {
            console.log(
              `[LLM] Rule rejected — failed to parse YAML for quality gate: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
            );
            continue;
          }

          if (!gateResult.passed) {
            console.log(`[LLM] Rule rejected by ATR Quality Gate: ${gateResult.issues.join('; ')}`);
            continue;
          }

          if (gateResult.warnings.length > 0) {
            console.log(`[LLM] Rule passed gate with warnings: ${gateResult.warnings.join('; ')}`);
          }

          // Self-test: run the rule's own test_cases against its own regex.
          // This is the first-principles quality check — if LLM-produced regex
          // can't match its own TPs or incorrectly matches its own TNs, the
          // rule is broken regardless of how good the metadata looks.
          const selfTest = selfTestRule(ruleContent);
          if (!selfTest.passed) {
            console.log(
              `[LLM] Rule rejected by self-test: TP ${selfTest.tpMatched}/${selfTest.tpTotal}, TN FP ${selfTest.tnMatched}/${selfTest.tnTotal}. ` +
                `Reasons: ${selfTest.failureReasons.slice(0, 3).join(' | ')}`
            );
            continue;
          }
          console.log(
            `[LLM] Rule passed self-test: ${selfTest.tpMatched}/${selfTest.tpTotal} TP caught, ${selfTest.tnTotal - selfTest.tnMatched}/${selfTest.tnTotal} TN clean`
          );

          const patternHash = createHash('sha256').update(ruleContent).digest('hex').slice(0, 16);

          // Submit as proposal + auto-review
          this.db.insertATRProposal({
            patternHash,
            ruleContent,
            llmProvider: 'anthropic',
            llmModel: this.model,
            selfReviewVerdict: JSON.stringify({
              approved: true,
              source: 'skill-analysis',
              package: skill.package,
              provenance: 'llm-generated',
              gateWarnings: gateResult.warnings,
            }),
          });

          // Fire-and-forget: review the proposal we just created
          void this.reviewProposal(patternHash, ruleContent).catch((err: unknown) => {
            console.error(
              `LLM review failed for proposal ${patternHash} (skill: ${skill.package}):`,
              err instanceof Error ? err.message : String(err)
            );
          });

          proposals.push({ patternHash, ruleContent });
        }

        results.push({
          package: skill.package,
          threatsFound: proposals.length > 0,
          proposals,
          status: 'success',
        });
      } catch (err: unknown) {
        const errorReason = err instanceof Error ? err.message : String(err);
        console.error(`LLM analysis error for skill "${skill.package}": ${errorReason}`);
        results.push({
          package: skill.package,
          threatsFound: false,
          proposals: [],
          status: 'error',
          errorReason,
        });
      }
    }

    return results;
  }

  /**
   * Parse the LLM response into a structured verdict
   * 解析 LLM 回應為結構化裁決
   */
  private parseVerdict(responseText: string): LLMVerdict {
    const defaultVerdict: LLMVerdict = {
      approved: false,
      falsePositiveRisk: 'medium',
      coverageScore: 0,
      reasoning: 'Failed to parse LLM response',
    };

    try {
      // Extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { ...defaultVerdict, reasoning: 'No JSON found in LLM response' };
      }

      const parsed = JSON.parse(jsonMatch[0]) as Partial<LLMVerdict>;

      // Validate and normalize fields
      const approved = parsed.approved === true;

      const validRisks = ['low', 'medium', 'high'] as const;
      const normalizedRisk = (parsed.falsePositiveRisk ?? '').toString().toLowerCase().trim();
      const falsePositiveRisk = validRisks.includes(normalizedRisk as (typeof validRisks)[number])
        ? (normalizedRisk as 'low' | 'medium' | 'high')
        : 'medium';

      const coverageScore =
        typeof parsed.coverageScore === 'number'
          ? Math.max(0, Math.min(100, Math.round(parsed.coverageScore)))
          : 0;

      const reasoning =
        typeof parsed.reasoning === 'string'
          ? parsed.reasoning.slice(0, 1000)
          : 'No reasoning provided';

      return { approved, falsePositiveRisk, coverageScore, reasoning };
    } catch (err: unknown) {
      console.warn(`LLM verdict parse error: ${err instanceof Error ? err.message : String(err)}`);
      return defaultVerdict;
    }
  }
}
