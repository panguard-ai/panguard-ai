/**
 * Unified scan entry point.
 *
 * scanContent() is the single function both CLI and Website call.
 * Pure function: takes content string + options, returns ScanResult.
 * No I/O, no network, no filesystem.
 */

import type { ScanOptions, ScanResult, Finding, CheckResult, CompiledRule } from './types.js';
import { parseManifestFromString, parseSkillName } from './manifest-parser.js';
import { checkInstructions } from './instruction-patterns.js';
import { detectSecrets } from './secret-detection.js';
import { detectContextSignals } from './context-signals.js';
import { scanWithATR } from './atr-engine.js';
import { calculateRiskScore } from './risk-scorer.js';
import { contentHash, patternHash } from './hash-utils.js';

/**
 * Scan skill content for security threats.
 *
 * Composes all detection layers:
 * 1. Manifest parsing
 * 2. Context signal detection (boosters/reducers)
 * 3. ATR rule matching (two-pass: raw + stripped)
 * 4. Instruction pattern matching (prompt injection, tool poisoning, encoding attacks)
 * 5. Secret detection
 * 6. Risk scoring with context multiplier
 *
 * @param content - Raw SKILL.md or README.md content
 * @param options - Scan configuration
 */
export function scanContent(content: string, options: ScanOptions = {}): ScanResult {
  const start = Date.now();

  // Early return for empty content
  if (!content || content.trim().length === 0) {
    return {
      skillName: options.skillName ?? null,
      manifest: null,
      findings: [],
      checks: [{ status: 'info', label: 'No content to scan' }],
      riskScore: 0,
      riskLevel: 'LOW',
      contextSignals: { signals: [], multiplier: 1.0 },
      atrRulesEvaluated: 0,
      atrPatternsMatched: 0,
      contentHash: contentHash(content || ''),
      patternHash: '',
      durationMs: Date.now() - start,
    };
  }

  const findings: Finding[] = [];
  const checks: CheckResult[] = [];

  const sourceType = options.sourceType ?? 'skill';
  const isReadme = sourceType === 'documentation';

  // -- Parse manifest --
  const skillName = options.skillName ?? parseSkillName(content);
  const manifest = parseManifestFromString(content, skillName ?? 'unknown');

  // -- Context signals (pre-compute for ATR severity adjustments) --
  const ctx = detectContextSignals(content, manifest);
  const hasStrongReducers = ctx.multiplier < 0.7;
  const allReducers = ctx.signals.every((s) => s.type === 'reducer');
  const hasDefensiveText = ctx.signals.some(
    (s) => s.id === 'reduce-defensive-text-strong' || s.id === 'reduce-defensive-text'
  );

  // -- ATR pattern detection --
  const atrRules: readonly CompiledRule[] = options.atrRules ?? [];
  let atrMatchedCount = 0;

  if (atrRules.length > 0) {
    const atrResult = scanWithATR(content, atrRules, {
      isReadme,
      hasStrongReducers,
      allReducers,
      hasDefensiveText,
    });
    findings.push(...atrResult.findings);
    checks.push(atrResult.check);
    atrMatchedCount = atrResult.matchedCount;
  }

  // -- Instruction pattern detection --
  const instrResult = checkInstructions(manifest.instructions || content, sourceType);
  findings.push(...instrResult.findings);
  checks.push({
    status: instrResult.status,
    label: instrResult.label,
    findings: instrResult.findings,
  });

  // -- Secret detection --
  const secretResult = detectSecrets(content);
  findings.push(...secretResult.findings);
  checks.push(secretResult.check);

  // -- Manifest validation --
  const hasFrontmatter = /^---\n[\s\S]*?\n---/.test(content);
  const hasName = /^name:\s*.+/m.test(content);
  if (isReadme) {
    checks.push({ status: 'info', label: 'Manifest: no SKILL.md found, analyzed README.md' });
  } else if (!hasFrontmatter || !hasName) {
    checks.push({ status: 'warn', label: 'Manifest: incomplete structure' });
  } else {
    checks.push({ status: 'pass', label: 'Manifest: valid' });
  }

  // -- Content size --
  checks.push({
    status: content.length > 50_000 ? 'warn' : 'pass',
    label: `Size: ${(content.length / 1024).toFixed(1)}KB`,
  });

  // -- Context signals report --
  if (ctx.signals.length > 0) {
    const boosterCount = ctx.signals.filter((s) => s.type === 'booster').length;
    const reducerCount = ctx.signals.filter((s) => s.type === 'reducer').length;
    checks.push({
      status: boosterCount > 0 ? 'warn' : 'pass',
      label: `Context: ${boosterCount} risk booster(s), ${reducerCount} reducer(s), multiplier ${ctx.multiplier.toFixed(2)}x`,
    });
  }

  // -- Risk scoring --
  // README files are documentation, not agent instructions.
  // Keyword matches in feature descriptions are expected, not threats.
  // Apply a heavy discount so legitimate READMEs don't score CRITICAL.
  // README raw scores are typically 100-200 (many keyword matches in feature
  // descriptions) so we need a strong discount to reach LOW/MEDIUM range.
  const effectiveMultiplier = isReadme ? Math.min(ctx.multiplier * 0.15, 0.25) : ctx.multiplier;
  const { score, level } = calculateRiskScore(findings, effectiveMultiplier);

  // -- Hashes --
  const cHash = contentHash(content);
  const highFindings = findings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 5);
  const findingSummary = highFindings.map((f) => f.title).join('; ');
  const pHash = patternHash(skillName ?? cHash, findingSummary);

  const durationMs = Date.now() - start;

  return {
    skillName,
    manifest,
    findings,
    checks,
    riskScore: score,
    riskLevel: level,
    contextSignals: ctx,
    atrRulesEvaluated: atrRules.length,
    atrPatternsMatched: atrMatchedCount,
    contentHash: cHash,
    patternHash: pHash,
    durationMs,
  };
}
