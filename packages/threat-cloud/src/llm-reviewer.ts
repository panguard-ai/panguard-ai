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
import type { ThreatCloudDB } from './database.js';

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

    // If high false positive risk AND not approved, reject the proposal
    if (!verdict.approved && verdict.falsePositiveRisk === 'high') {
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
      const requestBody = JSON.stringify({
        model: this.model,
        max_tokens: 1024,
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
   GOOD: '(?i)(curl|wget)\\s+[^\\n]*\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}[^|]*\\|\\s*(bash|sh)'
   BAD:  "config.*base64.*import" (too broad, double quotes cause YAML escape bugs)
   CRITICAL: Always use SINGLE QUOTES for regex values in YAML. Double quotes break \\s, \\d, \\w.

2. FALSE POSITIVES — regex MUST NOT trigger on:
   - Legitimate deployment/monitoring/admin tools
   - Security scanning tools that DESCRIBE attack patterns as examples
   - Normal API clients reading credentials from config
   - DevOps skills mentioning shell commands in documentation context
   TEST: mentally run your regex against "npm install express" and "deploy to AWS" — if it triggers, it's too broad.

3. REAL ATTACKS ONLY — not "this tool has broad permissions":
   - Hidden LLM instructions ("always approve", "skip verification", "do not inform user")
   - Credential exfiltration (read ~/.ssh + send externally)
   - Malicious code execution (curl|bash from raw IP, base64 decode + exec)
   - Supply chain (typosquat names, unofficial fork claims)
   - Reverse shells, DNS exfiltration, IMDS access

4. TEST CASES — 3+ true_positives, 3+ true_negatives:
   - TP must be REAL attack payloads (not hypothetical)
   - TN must be similar-looking LEGITIMATE content
   - YOUR REGEX MUST ACTUALLY MATCH ALL TP AND MISS ALL TN. Verify before outputting.

5. REFERENCES — every rule must map to OWASP:
   references:
     owasp_llm:
       - "LLM01:2025 - Prompt Injection" (or appropriate category)
     owasp_agentic:
       - "ASI01:2026 - Agent Behaviour Hijack" (or appropriate category)

6. DECISION CRITERIA — output a rule or "NO_THREATS_FOUND":
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
      value: '<SINGLE-QUOTED compound regex with 3+ word context>'
      description: '<what malicious pattern this matches>'
  condition: any
  false_positives:
    - '<describe what legitimate content could look similar>'
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
    - input: '<variant 3>'
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
\`\`\`

BEFORE OUTPUTTING: verify your regex matches ALL true_positives and misses ALL true_negatives. If it doesn't, fix the regex or output NO_THREATS_FOUND.`;

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
        console.log(`[LLM] analyzeSkills response for "${skill.package}" (${responseText.length} chars):`);
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
        const yamlBlocks = responseText.match(/```yaml\n([\s\S]*?)```/g);
        if (!yamlBlocks || yamlBlocks.length === 0) {
          console.log(`[LLM] No YAML blocks found in response for "${skill.package}". Response starts with: ${responseText.slice(0, 200)}`);
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
          const ruleContent = block
            .replace(/```yaml\n?/, '')
            .replace(/```$/, '')
            .trim();

          // Validate: must have required ATR fields
          if (!ruleContent.includes('title:') || !ruleContent.includes('detection:')) {
            console.log(`[LLM] YAML block skipped — missing title: (${ruleContent.includes('title:')}) or detection: (${ruleContent.includes('detection:')}). First 200 chars: ${ruleContent.slice(0, 200)}`);
            continue;
          }

          // Validate regex in the rule (match both single and double quoted values)
          const regexMatch = ruleContent.match(/value:\s*(['"])((?:(?!\1).)+)\1/);
          if (regexMatch) {
            try {
              new RegExp(regexMatch[2]!, 'i');
            } catch (regexErr) {
              console.log(`[LLM] YAML block skipped — invalid regex: ${regexMatch[2]?.slice(0, 100)}. Error: ${regexErr instanceof Error ? regexErr.message : String(regexErr)}`);
              continue; // Skip rules with invalid regex
            }
          }

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
