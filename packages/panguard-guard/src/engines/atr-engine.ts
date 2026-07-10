/**
 * ATR Engine Integration for PanguardGuard
 *
 * Bridges the ATR (Agent Threat Rules) engine with the existing
 * GuardEngine pipeline. Converts SecurityEvents into AgentEvents
 * and routes ATR matches into the DetectionResult pipeline.
 *
 * @module @panguard-ai/panguard-guard/engines/atr-engine
 */

import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createLogger } from '@panguard-ai/core';
import type { SecurityEvent } from '@panguard-ai/core';
import { ATREngine, SessionTracker, SkillFingerprintStore } from '@panguard-ai/atr';
import type {
  ATRMatch,
  ATRRule,
  AgentEvent,
  AgentEventType,
  BehaviorAnomaly,
} from '@panguard-ai/atr';
import { SkillWhitelistManager } from './skill-whitelist.js';
import type { SkillWhitelistConfig } from './skill-whitelist.js';

const logger = createLogger('panguard-guard:atr-engine');

/**
 * True when the token that begins at `src[i]` is followed by an UNBOUNDED
 * quantifier (`+`, `*`, or `{n,}` with no upper bound). Bounded quantifiers
 * like `{2,4}` cannot drive exponential backtracking, so they are treated as
 * safe. Returns false when there is no quantifier.
 */
function hasUnboundedQuantifierAt(src: string, i: number): boolean {
  const next = src[i];
  if (next === '+' || next === '*') return true;
  if (next === '{') return /^\{\d*,\}/.test(src.slice(i));
  return false;
}

/**
 * Scan the interior of a group for a quantified atom or a quantified inner
 * group — the ingredient that, when the whole group is itself quantified,
 * produces catastrophic backtracking (e.g. the inner `+` of `(([a-z])+)+`).
 * Character classes and escapes are skipped so their contents cannot be
 * mistaken for quantifiable structure.
 */
function interiorHasQuantifiedAtom(interior: string): boolean {
  for (let i = 0; i < interior.length; i++) {
    const c = interior[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '[') {
      i++;
      while (i < interior.length && interior[i] !== ']') {
        if (interior[i] === '\\') i++;
        i++;
      }
      if (hasUnboundedQuantifierAt(interior, i + 1)) return true;
      continue;
    }
    if (c === ')') {
      if (hasUnboundedQuantifierAt(interior, i + 1)) return true;
      continue;
    }
    if (c === '+' || c === '*') return true;
    if (c === '{' && /^\{\d*,\}/.test(interior.slice(i))) return true;
  }
  return false;
}

/**
 * Structurally detect catastrophic nested-quantifier regexes: any group
 * `(...)` that is itself quantified by an unbounded quantifier AND whose
 * interior contains a quantified atom or quantified subgroup. This is the
 * `(a+)+` / `(([a-z])+)+` / `((ab)*)*` / `(a*)*b` class — the previous
 * `/\([^)]*[+*]\)[+*{]/` heuristic could not see an INNER quantified group
 * (its `[^)]*` cannot cross a nested `)`), so it accepted `(([a-z])+)+`
 * despite clean exponential blowup. This walks the source, matches groups via
 * a paren stack (honoring escapes + char classes), and checks each quantified
 * group's interior at any nesting depth.
 */
function hasNestedQuantifier(src: string): boolean {
  const openStack: number[] = [];
  const groups: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '[') {
      i++;
      while (i < src.length && src[i] !== ']') {
        if (src[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '(') openStack.push(i);
    else if (c === ')') {
      const start = openStack.pop();
      if (start !== undefined) groups.push({ start, end: i });
    }
  }
  for (const g of groups) {
    if (!hasUnboundedQuantifierAt(src, g.end + 1)) continue;
    if (interiorHasQuantifiedAtom(src.slice(g.start + 1, g.end))) return true;
  }
  return false;
}

/**
 * Hardened ReDoS safety check for the cloud-rule compile gate.
 * A successful `new RegExp(p)` compile does NOT detect catastrophic
 * backtracking — patterns like (a+)+, (a*)*b, ([a-z]+)* compile fine but blow
 * up to exponential time on non-matching input. This rejects those structures
 * statically before a cloud rule's regex is ever executed against live traffic.
 *
 * NOTE — divergence, do NOT assume parity: packages/scan-core/src/atr-engine.ts
 * still carries the older single-heuristic form (`/\([^)]*[+*]\)[+*{]/`) which
 * cannot see an INNER quantified group and therefore accepts `(([a-z])+)+`.
 * This guard copy replaced that heuristic with the structural `hasNestedQuantifier`
 * walk above; scan-core (and the upstream @panguard-ai/atr `isReDoSSafe`) must be
 * brought to the same standard separately before this can be re-unified into one
 * shared implementation.
 *
 * Exported for direct unit testing of the ReDoS compile-gate.
 */
export function isSafeRegex(re: RegExp): boolean {
  const src = re.source;
  // Reject nested quantifiers, incl. INNER quantified groups: (a+)+, (([a-z])+)+,
  // ((ab)*)*, (a*)*b. Structural walk — not a single heuristic regex — so
  // arbitrarily nested quantified subgroups are caught.
  if (hasNestedQuantifier(src)) return false;
  // Reject overlapping alternations with quantifiers: (a|a)+
  if (/\(([^|)]+)\|\1\)[+*]/.test(src)) return false;
  // Reject star-of-star: .*.*.*  (3+ consecutive greedy wildcards)
  if (/(\.\*){3,}/.test(src)) return false;
  return true;
}

/**
 * Resolve the bundled ATR rules directory from the installed @panguard-ai/atr package.
 * Falls back to null if the package can't be resolved.
 */
function resolveBundledRulesDir(): string | null {
  // Strategy 1: Walk up from this module searching node_modules for agent-threat-rules/rules.
  // This is more robust than require.resolve() which fails when the package
  // uses strict ESM exports (as agent-threat-rules v2.0.0 does).
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    let dir = thisDir;
    for (let i = 0; i < 10; i++) {
      const candidate = join(dir, 'node_modules', 'agent-threat-rules', 'rules');
      if (existsSync(candidate)) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    /* continue to next strategy */
  }

  // Strategy 4: Fallback to bundled-rules shipped with this package
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    let dir = thisDir;
    for (let i = 0; i < 5; i++) {
      const candidate = join(dir, 'bundled-rules');
      if (existsSync(candidate)) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    /* continue to next strategy */
  }

  return null;
}

export interface GuardATREngineConfig {
  /** Directory containing custom ATR YAML rules */
  rulesDir?: string;
  /** Directory containing bundled ATR rules (auto-resolved from @panguard-ai/atr if omitted) */
  bundledRulesDir?: string;
  /** Enable hot-reload of rule files */
  hotReload?: boolean;
  /** Skill whitelist configuration / Skill 白名單配置 */
  whitelist?: SkillWhitelistConfig;
  /**
   * Detection lane — controls which rule maturities fire at runtime.
   *   'enforce' (default) : only maturity=stable rules. Lowest false-positive
   *                         lane (~0.2% FP on the 65K-sample benign corpus).
   *                         Correct for a runtime that auto-acts: never block on
   *                         an unproven rule. The sync path also drops broad
   *                         `confirm: embedding` rules (they need async
   *                         confirmation this hot path cannot run).
   *   'alert'             : stable + test. Analyst / correlation lane.
   *   'hunt'              : every rule incl. draft. Highest recall, ~9% FP.
   *                         Offline review only — never for auto-action.
   */
  lane?: 'enforce' | 'alert' | 'hunt';
}

/**
 * GuardATREngine wraps the ATR engine for integration with
 * the PanguardGuard event processing pipeline.
 *
 * Rules are loaded from:
 * 1. Bundled rules shipped with the @panguard-ai/atr package
 * 2. Custom rules from the user's configured rulesDir
 */
export class GuardATREngine {
  private readonly engine: ATREngine;
  private readonly bundledEngine: ATREngine | null;
  private readonly cloudRuleIds = new Set<string>();
  private readonly bundledRuleIds = new Set<string>();
  private matchCount = 0;
  private readonly sessionTracker: SessionTracker;
  private readonly fingerprintStore: SkillFingerprintStore;
  private readonly whitelistManager: SkillWhitelistManager;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: GuardATREngineConfig = {}) {
    // Shared session tracker for behavioral detection across events
    const sessionTracker = new SessionTracker();

    // Runtime detection lane. Default 'hunt' (every rule) ON PURPOSE: the guard
    // daemon does NOT hard-block on a raw match — it gates block-vs-notify on
    // verdict confidence + actionPolicy downstream (see event-processor). So we
    // want full DETECTION visibility here (incl. the broad workhorse rule
    // ATR-2026-00001, maturity=stable but confirm:embedding), and let the
    // confidence gate decide what's actionable.
    //
    // NOTE: do NOT naively flip this to 'enforce'. The sync engine path drops
    // every `confirm: embedding` rule (00001 included) because confirmation is
    // async and this runtime ships no embedding model — enforce here would
    // silently miss basic attacks like "ignore previous instructions" / DAN
    // that ONLY 00001 catches. Verified 2026-06-16: enforce caught 1/4 sample
    // attacks vs hunt's 3/4, with 0 FP on benign in BOTH lanes. The FP control
    // belongs at the action gate, not the detection lane.
    const lane = config.lane ?? 'hunt';

    // Primary engine for custom user rules
    this.engine = new ATREngine({
      rulesDir: config.rulesDir,
      sessionTracker,
      lane,
    });

    // Bundled rules from the @panguard-ai/atr package
    const bundledDir = config.bundledRulesDir ?? resolveBundledRulesDir();
    if (bundledDir) {
      this.bundledEngine = new ATREngine({ rulesDir: bundledDir, sessionTracker, lane });
    } else {
      this.bundledEngine = null;
    }

    this.sessionTracker = sessionTracker;

    // Skill behavioral fingerprinting for post-install drift detection
    // Skill 行為指紋：偵測安裝後行為偏移
    this.fingerprintStore = new SkillFingerprintStore();

    // Skill whitelist manager / Skill 白名單管理器
    this.whitelistManager = new SkillWhitelistManager(config.whitelist);
  }

  /**
   * Load ATR rules from both bundled and custom sources.
   * Call during GuardEngine.start().
   */
  async loadRules(): Promise<number> {
    let total = 0;

    // Load bundled rules from @panguard-ai/atr package
    if (this.bundledEngine) {
      const bundled = await this.bundledEngine.loadRules();
      total += bundled;
      // Track bundled rule IDs so cloud rules don't duplicate them
      for (const r of this.bundledEngine.getRules()) {
        this.bundledRuleIds.add(r.id);
      }
      logger.info(`ATR bundled rules loaded: ${bundled} rules`);
    }

    // Load custom user rules
    const custom = await this.engine.loadRules();
    total += custom;
    if (custom > 0) {
      logger.info(`ATR custom rules loaded: ${custom} rules`);
    }

    if (total === 0) {
      logger.warn(
        'ATR: No rules loaded from any source. Detection will not function. ' +
          'Verify that @panguard-ai/atr package is installed and rules directory exists. / ' +
          'ATR: 未從任何來源載入規則。偵測將無法運作。'
      );
    }

    logger.info(`ATR total rules: ${total}`);
    return total;
  }

  /**
   * Reload rules in place without dropping the engine.
   *
   * Re-runs `loadRules()` on the underlying ATREngine instances, which
   * synchronously clears `this.rules` + recompiles patterns. Because Node
   * is single-threaded, in-flight `evaluate()` calls cannot interleave
   * with the swap — they either run entirely against the old rule set or
   * entirely against the new one.
   *
   * Triggered by SIGHUP or by the optional fsnotify rule-dir watcher.
   * Safe to call concurrently — the underlying engine handles repeat
   * invocations idempotently.
   *
   * @returns total rule count after reload
   */
  async reloadRules(): Promise<{ total: number; bundled: number; custom: number }> {
    let bundled = 0;
    if (this.bundledEngine) {
      bundled = await this.bundledEngine.loadRules();
      this.bundledRuleIds.clear();
      for (const r of this.bundledEngine.getRules()) {
        this.bundledRuleIds.add(r.id);
      }
    }
    const custom = await this.engine.loadRules();
    const total = bundled + custom;
    logger.info(`ATR rules reloaded: ${total} total (${bundled} bundled + ${custom} custom)`);
    return { total, bundled, custom };
  }

  /**
   * Evaluate a SecurityEvent against ATR rules.
   * Converts SecurityEvent to AgentEvent format and runs evaluation.
   */
  evaluate(event: SecurityEvent): ATRMatch[] {
    const agentEvent = this.toAgentEvent(event);
    if (!agentEvent) return [];

    // Evaluate against both bundled and custom rules
    const bundledMatches = this.bundledEngine?.evaluate(agentEvent) ?? [];
    const customMatches = this.engine.evaluate(agentEvent);
    const matches = [...bundledMatches, ...customMatches];

    // Skill behavioral fingerprinting: track + detect drift
    // Skill 行為指紋：追蹤 + 偵測偏移
    const toolName = agentEvent.fields?.['tool_name'];
    if (toolName && (agentEvent.type === 'tool_call' || agentEvent.type === 'tool_response')) {
      const anomalies = this.fingerprintStore.recordInvocation(toolName, agentEvent);

      if (anomalies.length > 0) {
        // Drift detected — revoke whitelist if fingerprint-sourced
        this.whitelistManager.onFingerprintDrift(toolName);

        for (const anomaly of anomalies) {
          logger.warn(`Skill behavior drift: ${anomaly.description} [${anomaly.severity}]`);
          // Convert anomaly into a synthetic ATR match so it enters the detection pipeline
          matches.push(this.anomalyToATRMatch(anomaly));
          this.matchCount++;
        }
      } else {
        // No anomalies — check if fingerprint is stable enough for whitelist auto-promotion
        const fp = this.fingerprintStore.getFingerprint(toolName);
        if (fp?.isStable && !this.whitelistManager.isWhitelisted(toolName)) {
          this.whitelistManager.autoPromote(toolName, fp.capabilityHash);
        }
      }
    }

    if (matches.length > 0) {
      this.matchCount += matches.filter((m) => m.rule.id !== 'ATR-DRIFT-DETECT').length;
      logger.warn(
        `ATR match: ${matches.length} rules triggered for event ${event.id} ` +
          `[${matches.map((m) => m.rule.id).join(', ')}]`
      );
    }

    return matches;
  }

  /** Maximum number of cloud rules to accept (prevent resource exhaustion) */
  private static readonly MAX_CLOUD_RULES = 500;

  /**
   * Add a rule from Threat Cloud. Skips if already loaded, over capacity,
   * or contains unsafe regex patterns.
   */
  addCloudRule(rule: ATRRule): void {
    // Skip if already loaded from bundled or cloud sources
    if (this.bundledRuleIds.has(rule.id) || this.cloudRuleIds.has(rule.id)) return;
    // Layer 3: capacity cap
    if (this.cloudRuleIds.size >= GuardATREngine.MAX_CLOUD_RULES) return;
    // Layer 2: reject rules with unsafe regex patterns (ReDoS prevention)
    if (!GuardATREngine.validatePatterns(rule)) return;
    this.engine.addRule(rule);
    this.cloudRuleIds.add(rule.id);
  }

  /**
   * Validate that every regex pattern in a cloud rule is safe to compile AND
   * safe to execute. For each pattern we check, in order:
   *   1. it is a string and within MAX_PATTERN_LEN (resource bound),
   *   2. it compiles via `new RegExp()` (rejects malformed patterns),
   *   3. it passes isSafeRegex() (rejects catastrophic-backtracking ReDoS
   *      structures that compile fine but hang on non-matching input).
   *
   * Both condition shapes are covered:
   *   - named-format: { condName: { patterns: [...] } } (legacy/grouped),
   *   - array-format: [{ operator: "regex", value: "..." }] (current ATR rules).
   * Returns false (reject the rule) on the first unsafe pattern.
   */
  private static validatePatterns(rule: ATRRule): boolean {
    const MAX_PATTERN_LEN = 2000;

    const checkPattern = (p: unknown): boolean => {
      if (typeof p !== 'string') return false;
      if (p.length > MAX_PATTERN_LEN) return false;
      try {
        const re = new RegExp(p);
        if (!isSafeRegex(re)) return false;
      } catch {
        return false; // does not compile
      }
      return true;
    };

    // Validate a single condition node, recursing into sequence steps. A rule can
    // nest regexes inside `steps`/`sequence` — if the gate does not descend into
    // them, a catastrophic-backtracking pattern smuggled in a step still reaches
    // the engine's ungated sequence-step compile. Recurse so EVERY compiled regex
    // passes the ReDoS gate, not just the top-level ones.
    const checkCondition = (cond: unknown): boolean => {
      if (!cond || typeof cond !== 'object') return true;
      const node = cond as {
        patterns?: unknown;
        operator?: unknown;
        value?: unknown;
        steps?: unknown;
        sequence?: unknown;
      };
      // Named/grouped format: { patterns: [string, ...] }
      if (Array.isArray(node.patterns)) {
        for (const p of node.patterns) if (!checkPattern(p)) return false;
      }
      // Array format: { operator: "regex", value: "..." }
      if (node.operator === 'regex' && node.value !== undefined) {
        if (!checkPattern(node.value)) return false;
      }
      // Sequence format: { steps: [...] } / { sequence: [...] } — each step is a
      // nested condition whose regexes must also pass the gate.
      for (const key of ['steps', 'sequence'] as const) {
        const steps = node[key];
        if (Array.isArray(steps)) {
          for (const s of steps) if (!checkCondition(s)) return false;
        }
      }
      return true;
    };

    const conditions = rule.detection?.conditions;
    if (Array.isArray(conditions)) {
      for (const cond of conditions) if (!checkCondition(cond)) return false;
    } else if (conditions && typeof conditions === 'object') {
      // Named-map form: { name: <condition>, ... } — the engine compiles these too.
      for (const cond of Object.values(conditions)) if (!checkCondition(cond)) return false;
    }

    return true;
  }

  /**
   * Convert a SecurityEvent into an AgentEvent for ATR evaluation.
   * Returns null if the event is not relevant to agent threat detection.
   */
  private toAgentEvent(event: SecurityEvent): AgentEvent | null {
    const meta = event.metadata ?? {};

    // Determine event type based on SecurityEvent source and metadata
    let type: AgentEventType;
    let content: string;
    const fields: Record<string, string> = {};

    switch (event.source) {
      case 'agent_input':
      case 'llm_input':
        type = 'llm_input';
        content = (meta['prompt'] as string) ?? (meta['input'] as string) ?? event.description;
        if (meta['user_input']) fields['user_input'] = meta['user_input'] as string;
        break;

      case 'agent_output':
      case 'llm_output':
        type = 'llm_output';
        content = (meta['response'] as string) ?? (meta['output'] as string) ?? event.description;
        if (meta['agent_output']) fields['agent_output'] = meta['agent_output'] as string;
        break;

      case 'tool_call':
      case 'function_call':
        type = 'tool_call';
        content = (meta['tool_name'] as string) ?? event.description;
        if (meta['tool_name']) fields['tool_name'] = meta['tool_name'] as string;
        if (meta['tool_args']) fields['tool_args'] = JSON.stringify(meta['tool_args']);
        break;

      case 'tool_response':
      case 'mcp_response':
        type = 'tool_response';
        content =
          (meta['tool_response'] as string) ?? (meta['result'] as string) ?? event.description;
        if (meta['tool_name']) fields['tool_name'] = meta['tool_name'] as string;
        if (meta['tool_response']) fields['tool_response'] = meta['tool_response'] as string;
        break;

      case 'agent_behavior':
        type = 'agent_behavior';
        content = event.description;
        break;

      case 'multi_agent':
        type = 'multi_agent_message';
        content = (meta['message'] as string) ?? event.description;
        if (meta['source_agent']) fields['source_agent'] = meta['source_agent'] as string;
        if (meta['target_agent']) fields['target_agent'] = meta['target_agent'] as string;
        break;

      default:
        // Not an agent-related event
        return null;
    }

    // Extract behavioral metrics if present
    const metrics: Record<string, number> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (typeof value === 'number' && key.startsWith('metric_')) {
        metrics[key.slice(7)] = value;
      }
    }

    // Ensure sessionId is always set for SessionTracker correlation.
    // Priority: explicit metadata > source-based derivation > daemon default.
    // 確保 sessionId 始終設定，以供 SessionTracker 關聯使用。
    const sessionId =
      (meta['sessionId'] as string | undefined) ??
      (meta['agentId'] ? `agent:${meta['agentId']}` : undefined) ??
      (event.source ? `guard:${event.source}` : 'guard:default');

    return {
      type,
      timestamp: new Date().toISOString(),
      content,
      fields: Object.keys(fields).length > 0 ? fields : undefined,
      metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
      sessionId,
      agentId: meta['agentId'] as string | undefined,
      metadata: meta,
    };
  }

  /** Get total match count */
  getMatchCount(): number {
    return this.matchCount;
  }

  /** Get loaded rule count (bundled + custom) */
  getRuleCount(): number {
    return (this.bundledEngine?.getRuleCount() ?? 0) + this.engine.getRuleCount();
  }

  /**
   * Return every loaded ATR rule (bundled + dynamically added cloud rules) in
   * a denormalized shape suitable for SARIF / Evidence Pack export. Reads
   * directly from the in-memory engines so callers do not need to scan YAML
   * on disk.
   */
  getAllRules(): Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    description: string;
  }> {
    const out: Array<{
      id: string;
      title: string;
      severity: string;
      category: string;
      description: string;
    }> = [];
    const seen = new Set<string>();
    const collectFrom = (rules: Iterable<unknown>): void => {
      for (const r of rules) {
        const rule = r as {
          id?: string;
          title?: string;
          severity?: string;
          category?: string;
          description?: string;
        };
        const id = rule.id?.trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          title: rule.title ?? id,
          severity: rule.severity ?? 'medium',
          category: rule.category ?? 'unknown',
          description: (rule.description ?? '').slice(0, 200),
        });
      }
    };
    try {
      if (this.bundledEngine) collectFrom(this.bundledEngine.getRules());
    } catch {
      /* bundled engine may be uninitialized */
    }
    try {
      collectFrom(this.engine.getRules());
    } catch {
      /* cloud engine may be uninitialized */
    }
    return out;
  }

  /**
   * Start periodic session cleanup (evict sessions idle > 30 minutes).
   * Call after loadRules() to begin maintenance.
   */
  startSessionCleanup(): void {
    if (this.cleanupTimer) return;
    const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const SESSION_MAX_AGE = 30 * 60 * 1000; // 30 minutes
    this.cleanupTimer = setInterval(() => {
      const evicted = this.sessionTracker.cleanup(SESSION_MAX_AGE);
      if (evicted > 0) {
        logger.info(`ATR session cleanup: evicted ${evicted} idle sessions`);
      }
      // Periodic session stats for monitoring / 定期 session 統計（監控用途）
      const stats = this.getSessionStats();
      if (stats.activeSessions > 0 || stats.totalMatches > 0) {
        logger.info(
          `ATR stats: ${stats.activeSessions} active sessions, ` +
            `${stats.totalMatches} matches, ${stats.totalRules} rules, ` +
            `${stats.trackedSkills} tracked skills (${stats.stableFingerprints} stable)`
        );
      }
    }, CLEANUP_INTERVAL);
  }

  /** Stop session cleanup timer */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** Get active session count */
  getSessionCount(): number {
    return this.sessionTracker.getSessionCount();
  }

  /**
   * Get a summary of session tracking state for dashboard/monitoring.
   * 取得 session 追蹤狀態摘要（供儀表板/監控使用）。
   */
  getSessionStats(): {
    activeSessions: number;
    totalMatches: number;
    totalRules: number;
    trackedSkills: number;
    stableFingerprints: number;
  } {
    return {
      activeSessions: this.sessionTracker.getSessionCount(),
      totalMatches: this.matchCount,
      totalRules: this.getRuleCount(),
      trackedSkills: this.fingerprintStore.getTrackedCount(),
      stableFingerprints: this.fingerprintStore.getStableCount(),
    };
  }

  /** Get tracked skill count / 取得已追蹤的 skill 數量 */
  getTrackedSkillCount(): number {
    return this.fingerprintStore.getTrackedCount();
  }

  /** Get stable fingerprint count / 取得已穩定指紋數量 */
  getStableFingerprintCount(): number {
    return this.fingerprintStore.getStableCount();
  }

  /** Get the whitelist manager instance / 取得白名單管理器 */
  getWhitelistManager(): SkillWhitelistManager {
    return this.whitelistManager;
  }

  /** Check if a skill is whitelisted (shorthand) / 檢查 skill 是否在白名單 */
  isSkillWhitelisted(skillName: string): boolean {
    return this.whitelistManager.isWhitelisted(skillName);
  }

  /**
   * Compute confidence score for a behavioral anomaly.
   * Uses severity as a base and applies a type-specific bonus that reflects
   * how strong each anomaly type is as an indicator of compromise.
   *
   * Base scores: critical=80, high=65, medium=50, low=35
   * Type bonuses: capability_expansion +15, new_process_exec +12,
   *   new_network_target +10, new_env_access +8, new_filesystem_op +5,
   *   new_output_pattern +3
   * Final score capped at 99.
   */
  private computeAnomalyConfidence(anomaly: BehaviorAnomaly): number {
    const baseScores: Record<string, number> = {
      critical: 80,
      high: 65,
      medium: 50,
      low: 35,
    };

    // Anomaly types ranked by threat signal strength
    const typeBonus: Record<string, number> = {
      capability_expansion: 15,
      new_process_exec: 12,
      new_network_target: 10,
      new_env_access: 8,
      new_filesystem_op: 5,
      new_output_pattern: 3,
    };

    const base = baseScores[anomaly.severity] ?? 50;
    const bonus = typeBonus[anomaly.anomalyType] ?? 0;

    return Math.min(base + bonus, 99);
  }

  /**
   * Convert a behavioral anomaly into a synthetic ATR match
   * for the detection pipeline.
   * 將行為異常轉換為合成 ATR 匹配，進入偵測管線
   */
  private anomalyToATRMatch(anomaly: BehaviorAnomaly): ATRMatch {
    const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };

    return {
      rule: {
        title: `Skill Behavioral Drift: ${anomaly.skillName}`,
        id: 'ATR-DRIFT-DETECT',
        status: 'stable',
        description: anomaly.description,
        author: 'Panguard Skill Fingerprint',
        date: new Date().toISOString().slice(0, 10),
        severity: severityMap[anomaly.severity] ?? 'medium',
        tags: {
          category: 'skill-compromise',
          subcategory: anomaly.anomalyType,
          confidence: anomaly.severity === 'critical' ? 'high' : 'medium',
        },
        agent_source: { type: 'skill_lifecycle' },
        detection: {
          conditions: [],
          condition: 'fingerprint_drift',
        },
        response: {
          actions:
            anomaly.severity === 'critical'
              ? ['block_tool', 'alert', 'snapshot']
              : ['alert', 'snapshot'],
        },
      },
      matchedConditions: [anomaly.anomalyType],
      matchedPatterns: [anomaly.newValue],
      confidence: this.computeAnomalyConfidence(anomaly),
      timestamp: new Date().toISOString(),
    } as unknown as ATRMatch;
  }
}
