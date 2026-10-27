/**
 * ATR Evaluator — wraps ATR engine for proxy use
 *
 * Loads rules once on startup. Evaluates tool calls and responses.
 * Returns allow/deny/ask verdict.
 *
 * @module @panguard-ai/panguard-mcp-proxy/evaluator
 */

import { ATREngine } from '@panguard-ai/atr';
import type { AgentEvent } from '@panguard-ai/atr';
import { resolve, dirname, join } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Find bundled ATR rules directory from agent-threat-rules npm package.
 *  Walks up from this module searching node_modules. This is more robust
 *  than require.resolve() which fails with strict ESM exports (v2.0.0+). */
function findRulesDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = resolve(dir, 'node_modules', 'agent-threat-rules', 'rules');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error('Cannot find ATR rules directory. Install agent-threat-rules.');
}

export interface EvalResult {
  readonly outcome: 'allow' | 'deny' | 'ask';
  readonly reason: string;
  readonly matchedRules: readonly string[];
  readonly confidence: number;
  readonly durationMs: number;
  /**
   * Gap A slice 2: true when a non-'allow' outcome is driven ONLY by advise-only
   * (fresh, untrusted auto-pulled) rules — i.e. no bundled/trusted rule justifies
   * it. A caller MUST NOT escalate such an outcome to a hard block (even under an
   * enforce posture), so a fresh rule can never wall off a tool call until the
   * user trusts it. Always false for 'deny' (deny only ever comes from a trusted
   * rule) and for 'allow'.
   */
  readonly adviseOnly: boolean;
}

/**
 * The synthetic matchedRules id the evaluator emits when its OWN evaluation
 * throws (a fail-closed 'deny' produced by the catch below, NOT a real rule
 * match). Exported as the single source of truth so the tool-call hook can
 * detect an engine crash and fail OPEN (never brick the agent) instead of
 * treating it as a real block — see panguard/cli/commands/hook.ts. Keep the two
 * sides coupled through THIS constant, never a bare string, so a rename can't
 * silently break the fail-open contract.
 */
export const EVALUATION_ERROR_SENTINEL = 'evaluation-error';

/** Minimal rule shape the deny policy needs. */
interface RuleLike {
  readonly severity: string;
  readonly maturity?: string;
  readonly confirm?: string;
  /** ATR scan_target lives on the parsed rule under tags (rich vocab: mcp /
   *  tool_args / skill / host / code / any / llm_io / ...). Used by the built-in-
   *  tool surface gate to skip MCP-argument rules on a native shell command. */
  readonly tags?: { readonly scan_target?: string; readonly subcategory?: string };
}

/**
 * The ONLY rule subcategories whose detection keys on shell METACHARACTERS
 * (`;` `|` `$()` `&&`) — the grammar that is anomalous inside an MCP tool
 * argument but NORMAL in the agent's own shell. Only these may degrade on the
 * built-in-tool surface. Everything else scoped scan_target:mcp (credential-theft,
 * env-var-harvesting, tool-poisoning, ...) detects malicious SEMANTICS that are
 * illegitimate on any shell and MUST keep hard-blocking there. 1.8.12 wrongly
 * gated the whole scan_target:mcp class, which silently degraded credential theft
 * (`cat ~/.ssh/id_rsa`) to an advisory on the agent's own shell — a shipped hole.
 */
const SHELL_METACHAR_FP_SUBCATEGORIES: ReadonlySet<string> = new Set([
  'shell-escape',
  'parameter-injection',
]);

/**
 * Whether a single rule match is strong enough to HARD-DENY a live tool call
 * (vs. degrade to 'ask'). This is the proxy's false-positive control point: the
 * detection engine runs the full 'hunt' lane so nothing is missed, but we only
 * auto-break the agent on a signal we trust.
 *
 *   - confirm:embedding rules (the broad workhorses ATR-2026-00001/00002) need
 *     async semantic confirmation this proxy can't run and are the top FP
 *     sources -> never hard-deny unconfirmed (the caller degrades to 'ask').
 *   - critical severity hard-stops even on a younger rule (security-first:
 *     credential exfil / RCE / data destruction are specific, not broad).
 *   - high severity hard-stops only when proven (maturity=stable).
 *   - everything else (high-test, experimental, medium, low) -> not blockable.
 *
 * Pure + exported so the policy is unit-tested independently of which live rule
 * happens to match (the rule corpus changes daily; this policy must not).
 */
export function shouldHardDeny(rule: RuleLike, builtinToolSurface = false): boolean {
  if (rule.confirm === 'embedding') return false;
  if (
    builtinToolSurface &&
    rule.tags?.scan_target === 'mcp' &&
    SHELL_METACHAR_FP_SUBCATEGORIES.has(rule.tags?.subcategory ?? '')
  ) {
    // FALSE-POSITIVE gate for the built-in-tool hook, which guards the agent's
    // OWN native shell (Bash/Edit/Write/WebFetch). NARROWED (1.8.13) to ONLY the
    // shell-metacharacter-injection subcategories (shell-escape / parameter-
    // injection — ATR-2026-00111 / 00066) that key on `;` `|` `$()` grammar.
    // Inside an MCP argument those are anomalous and rightly deny; but they are the
    // NORMAL grammar of a real shell, so matched against the agent's own
    // `echo x; curl localhost` they false-block legitimate work (they only reach a
    // tool_call event via the engine's mcp-over-tool exception). On this surface
    // they DEGRADE to an 'ask' advisory. CRITICAL: every OTHER scan_target:mcp
    // rule still hard-blocks here — 1.8.12 wrongly gated the whole class, which
    // silently degraded credential theft (`cat ~/.ssh/id_rsa`, matched by the
    // scan_target:mcp credential-theft rule 00113) to a non-blocking advisory on
    // the agent's own shell. The MCP proxy leaves builtinToolSurface=false: on a genuine MCP
    // ARGUMENT, `; curl` really is injection. This keys on scan_target (a rule's
    // intrinsic scope), NOT maturity — so it never drifts with the daily corpus.
    return false;
  }
  if (rule.severity === 'critical') return true;
  return rule.severity === 'high' && rule.maturity === 'stable';
}

/**
 * The ATR engine's MAX_EVAL_LENGTH: it refuses to run a regex over a longer
 * field (safeRegexTest() returns false), so every condition on that field
 * silently misses. A tool response past this length used to be not scanned at
 * all, and padding a poisoned response past it evaded the indirect-injection scan.
 */
export const ENGINE_MAX_EVAL_LENGTH = 100_000;

/**
 * A response longer than ENGINE_MAX_EVAL_LENGTH is scanned in overlapping
 * windows. A response the engine can take whole stays one event, exactly as
 * before, so windowing adds no seams there.
 *
 * The window leaves headroom under the engine limit because the engine also
 * tests the Unicode-normalised text, which can be longer than the raw window
 * (NFKC can expand crafted input far beyond this headroom; the raw text is
 * still tested). A match that fits in the 10,000-char overlap always lies whole
 * inside one window, which exceeds the longest bounded gap a bundled rule
 * allows. A rule whose conditions match farther apart than the overlap can
 * still miss across a window boundary.
 */
export const RESPONSE_WINDOW_CHARS = 90_000;
export const RESPONSE_WINDOW_OVERLAP_CHARS = 10_000;

/** Appended to the reason when a long response's hard-deny match was held back to an advisory. */
export const LONG_RESPONSE_ADVISORY =
  ' [advisory: response over 100,000 chars, only stable rules block]';

/** Overlapping windows covering `text`, each at most `size` chars (the text itself when it fits). */
export function responseWindows(
  text: string,
  size = RESPONSE_WINDOW_CHARS,
  overlap = RESPONSE_WINDOW_OVERLAP_CHARS
): string[] {
  if (overlap < 0 || overlap >= size) {
    throw new RangeError(`window overlap (${overlap}) must be in [0, size=${size})`);
  }
  if (text.length <= size) return [text];
  const step = size - overlap;
  const count = Math.ceil((text.length - overlap) / step);
  return Array.from({ length: count }, (_, i) => text.slice(i * step, i * step + size));
}

const SEVERITY_RANK: ReadonlyMap<string, number> = new Map([
  ['critical', 0],
  ['high', 1],
  ['medium', 2],
  ['low', 3],
  ['informational', 4],
]);

interface MatchLike {
  readonly rule: { readonly id: string; readonly severity: string };
  readonly confidence: number;
}

/**
 * One match per rule (the most confident one), ordered the way the engine
 * orders a single evaluate(): severity first, then confidence. A rule that fires
 * in two windows counts once, and the verdict, reason and confidence of a
 * windowed response do not depend on which window a match came from.
 */
function mergeMatches<T extends MatchLike>(matches: readonly T[]): T[] {
  const best = new Map<string, T>();
  for (const m of matches) {
    const prev = best.get(m.rule.id);
    if (!prev || m.confidence > prev.confidence) best.set(m.rule.id, m);
  }
  const rank = (m: T) => SEVERITY_RANK.get(m.rule.severity) ?? 4;
  return [...best.values()].sort((a, b) => rank(a) - rank(b) || b.confidence - a.confidence);
}

export class ProxyEvaluator {
  private readonly engine: ATREngine;
  private rulesLoaded = false;
  private ruleCount = 0;
  /**
   * Gap A slice 2: IDs of auto-pulled rules that are ADVISE-ONLY — loaded fresh
   * from a not-yet-trusted bundle. They may surface an 'ask' advisory but are
   * EXCLUDED from the hard-deny decision, so a fresh rule can never silently
   * block the user's tool. Once the user trusts the bundle version, the hook
   * loads them with adviseOnly=false and they are absent from this set (i.e.
   * they arm). Bundled/shipped rules are never in this set.
   */
  private readonly adviseOnlyIds: Set<string> = new Set();
  private blockedTools: Set<string> = new Set();
  private readonly blocklistPath: string;
  private blocklistMtime = 0;
  private blocklistSize = 0;

  constructor() {
    const rulesDir = findRulesDir();
    // 'hunt' detection (every rule) so we never MISS an attack in a tool call —
    // incl. the broad workhorse rule ATR-2026-00001 (stable but confirm:embedding,
    // which an 'enforce' sync lane would silently drop since this proxy ships no
    // embedding model). FP-safety is enforced at the DENY gate instead: a match
    // only HARD-denies a live tool call when it is a proven rule (see evaluate());
    // unproven matches degrade to 'ask' rather than breaking the agent.
    this.engine = new ATREngine({ rulesDir });
    this.blocklistPath = join(homedir(), '.panguard-guard', 'blocked-tools.json');
    this.refreshBlocklist();
  }

  /** Reload blocklist from disk if modified (called before each evaluation) */
  private refreshBlocklist(): void {
    try {
      if (!existsSync(this.blocklistPath)) return;
      const stat = statSync(this.blocklistPath);
      // Check both mtime and size to catch sub-ms writes on APFS/Docker
      if (stat.mtimeMs <= this.blocklistMtime && stat.size === this.blocklistSize) return;
      const raw = readFileSync(this.blocklistPath, 'utf-8');
      const list = JSON.parse(raw) as string[];
      this.blockedTools = new Set(list.map((n: string) => n.toLowerCase()));
      this.blocklistMtime = stat.mtimeMs;
      this.blocklistSize = stat.size;
    } catch {
      /* best effort — keep previous blocklist on parse error */
    }
  }

  async loadRules(): Promise<number> {
    if (this.rulesLoaded) return this.ruleCount;
    this.ruleCount = await this.engine.loadRules();
    this.rulesLoaded = true;
    // 0 rules => the detection engine matches nothing, so every tool call gets
    // an 'allow' verdict (evaluate() returns allow when matches.length === 0).
    // That is protection silently OFF — never let it pass unannounced. We do NOT
    // hard-fail (a blocklist-only proxy with no ATR rules is still a degraded but
    // usable mode, and proxy fail-CLOSED on evaluation *crashes* is unchanged in
    // evaluate()); we surface it loudly so the operator and the dashboard can see
    // Layer A is degraded. See computeLayers() Layer A: ruleCount === 0 => 'degraded'.
    if (this.ruleCount === 0) {
      process.stderr.write(
        '[panguard-proxy] WARNING: 0 ATR rules loaded — pattern detection (Layer A) is DEGRADED. ' +
          'Tool calls will only be checked against the Guard blocklist; no rule-based threats will be caught. ' +
          'Verify the agent-threat-rules package is installed and the rules directory is populated.\n'
      );
    }
    return this.ruleCount;
  }

  /**
   * Gap A slice 2: merge auto-pulled rules (staged + integrity-verified by the
   * daemon) into the engine. ONLY rules whose id is not already bundled are
   * added — a newer bundle re-ships existing ids, and those stay as their trusted
   * bundled copy. `adviseOnly` marks the fresh ids so evaluate() lets them advise
   * but never hard-deny (see adviseOnlyIds). Best-effort: a failure here must
   * never break the enforce path, so it is caught and the proxy keeps running on
   * the bundled ruleset alone. Returns the number of fresh rules added.
   */
  async loadAutoRules(rulesDir: string, opts: { adviseOnly: boolean }): Promise<number> {
    try {
      if (!existsSync(rulesDir)) return 0;
      const existing = new Set(this.engine.getRules().map((r) => r.id));
      const sub = new ATREngine({ rulesDir });
      await sub.loadRules();
      let added = 0;
      for (const rule of sub.getRules()) {
        if (existing.has(rule.id)) continue; // already have this id from the bundled set
        this.engine.addRule(rule);
        if (opts.adviseOnly) this.adviseOnlyIds.add(rule.id);
        added++;
      }
      this.ruleCount += added;
      return added;
    } catch (err: unknown) {
      process.stderr.write(
        `[panguard-proxy] auto-rules load skipped (ignored, bundled rules unaffected): ${err instanceof Error ? err.message : String(err)}\n`
      );
      return 0;
    }
  }

  getRuleCount(): number {
    return this.ruleCount;
  }

  /** Number of auto-pulled rules currently held advise-only (not yet trusted). */
  getAdviseOnlyCount(): number {
    return this.adviseOnlyIds.size;
  }

  /** Flatten args into a readable string for ATR regex matching */
  private flattenArgs(args: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(args)) {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      parts.push(`${key}: ${str}`);
    }
    return parts.join('\n');
  }

  /**
   * Evaluate a tool call (PreToolUse).
   *
   * `eventType` selects which ATR rules apply. The MCP proxy sees genuine
   * MCP exchanges, so it keeps the 'mcp_exchange' default. The Claude-Code /
   * Gemini / Codex PreToolUse hook wraps built-in tools (Bash, Edit, Write,
   * WebFetch) — those are 'tool_call' events. Passing 'tool_call' makes the
   * engine run the tool_call rule set (shell injection, credential theft,
   * SSRF, RCE, privilege escalation) AND, via the engine's mcp-over-tool
   * exception, the mcp_exchange rules — while correctly skipping
   * multi_agent_comm and llm_io rules that never apply to a shell command.
   * The old hardcoded 'mcp_exchange' both missed the tool_call attack rules
   * and false-fired multi_agent_comm rules on ordinary commands.
   */
  async evaluateToolCall(
    toolName: string,
    args: Record<string, unknown>,
    eventType: AgentEvent['type'] = 'mcp_exchange',
    // The built-in-tool hook (guarding the agent's OWN Bash/Edit/Write) passes
    // true: on that high-FP surface an MCP-argument rule (scan_target:mcp shell-
    // metacharacter rule) advises instead of hard-blocking a real shell command.
    // The MCP proxy leaves it false (default) — on a genuine MCP argument those
    // rules correctly deny.
    builtinToolSurface = false
  ): Promise<EvalResult> {
    const start = Date.now();

    // Check Guard blocklist first (instant deny, no regex needed)
    this.refreshBlocklist();
    if (this.blockedTools.has(toolName.toLowerCase())) {
      return {
        outcome: 'deny',
        reason: `Tool "${toolName}" is on the Guard blocklist`,
        matchedRules: ['guard-blocklist'],
        confidence: 100,
        durationMs: Date.now() - start,
        adviseOnly: false,
      };
    }

    // Flatten args into natural text so ATR regexes can match content like paths and commands
    const flatContent = `${toolName} ${this.flattenArgs(args)}`;
    const event: AgentEvent = {
      type: eventType,
      timestamp: new Date().toISOString(),
      content: flatContent,
      fields: {
        tool_name: toolName,
        tool_input: flatContent,
      },
    };

    return this.evaluate([event], start, { builtinToolSurface });
  }

  /**
   * Evaluate a tool response (PostToolUse) — the indirect-prompt-injection path.
   *
   * The event MUST be typed 'tool_response' (NOT 'mcp_exchange'). A poisoned MCP /
   * tool / RAG output is where indirect prompt injection rides in, and the ATR
   * engine handles that case only for a 'tool_response'-typed event:
   *   1. EVENT_TYPE_TO_SOURCE['tool_response'] === 'mcp_exchange', which fires the
   *      engine's llmIoOverToolResponse exception so the whole llm_io family
   *      (system-prompt-override, SSRF-via-URL, SQLi-in-natural-language,
   *      shell-injection) is allowed to run against the response.
   *   2. getFieldValue() routes event.content into the user_input / agent_output
   *      fields ONLY when event.type === 'tool_response'. The ~200 llm_io rules
   *      that target user_input/agent_output therefore see the response text and
   *      can match.
   * Passing 'mcp_exchange' (the old value) is NOT a key in EVENT_TYPE_TO_SOURCE, so
   * eventSourceType is undefined: the source-type filter is bypassed (llm_io rules
   * run) but getFieldValue leaves user_input/agent_output undefined, so those rules
   * silently match nothing — defeating the entire indirect-injection scan.
   *
   * A response the engine can take whole (ENGINE_MAX_EVAL_LENGTH) is one such
   * event, exactly as before. A longer one used to be not scanned at all; it is
   * now one event per window (see responseWindows), merged before the deny
   * policy runs. In that newly covered range only a proven (maturity: stable)
   * rule hard-denies: the broad test-maturity rules fire on large benign
   * documents (compiled JS, type definitions, lockfiles), so there they surface
   * as an 'ask' advisory instead of blocking the tool.
   */
  async evaluateToolResponse(toolName: string, response: string): Promise<EvalResult> {
    const start = Date.now();
    const windowed = response.length > ENGINE_MAX_EVAL_LENGTH;
    const timestamp = new Date().toISOString();
    const events = (windowed ? responseWindows(response) : [response]).map(
      (text): AgentEvent => ({
        type: 'tool_response',
        timestamp,
        content: text,
        fields: {
          tool_name: toolName,
          tool_response: text,
        },
      })
    );

    return this.evaluate(events, start, { stableOnlyDeny: windowed });
  }

  private async evaluate(
    events: readonly AgentEvent[],
    start: number,
    {
      builtinToolSurface = false,
      stableOnlyDeny = false,
    }: { readonly builtinToolSurface?: boolean; readonly stableOnlyDeny?: boolean } = {}
  ): Promise<EvalResult> {
    try {
      const matches = mergeMatches(events.flatMap((event) => this.engine.evaluate(event)));
      const durationMs = Date.now() - start;

      if (matches.length === 0) {
        return {
          outcome: 'allow',
          reason: 'No threats detected',
          matchedRules: [],
          confidence: 0,
          durationMs,
          adviseOnly: false,
        };
      }

      // FALSE-POSITIVE CONTROL POINT (this is a SYNCHRONOUS per-tool-call gate).
      //  1. Hard-DENY on a trusted match (shouldHardDeny: critical, or high+stable).
      //  2. Otherwise surface an 'ask' advisory ONLY for a high-severity match —
      //     something serious enough to warrant a per-call heads-up even if
      //     unproven.
      //  3. Medium/low matches are demoted to a SILENT allow here. The engine
      //     runs full 'hunt' detection, and many broad rules (e.g. keyword-
      //     presence rules that fire on any `curl`/`rm`/`env`, severity=medium,
      //     condition:any) would otherwise spam an advisory on routine tool calls
      //     — the dominant false-positive source. Their matches are still
      //     returned in matchedRules and the async daemon path keeps them for
      //     offline review; we just do not raise a per-call advisory/block on an
      //     unactionable low-severity broad match. Real attacks are
      //     critical/high-stable and hard-deny at step 1, so are unaffected.
      // Gap A slice 2: an advise-only auto-pulled rule (fresh, not yet trusted)
      // is EXCLUDED from the hard-deny decision — it can still surface as an
      // 'ask' advisory below, but it can never silently block the user's tool.
      // Bundled/trusted rules are unaffected. This is the arm gate for the
      // enforce path.
      // A windowed long response (stableOnlyDeny) additionally needs a
      // maturity=stable rule to hard-deny; see evaluateToolResponse.
      const canHardDeny = (m: (typeof matches)[number]) =>
        shouldHardDeny(m.rule, builtinToolSurface) && !this.adviseOnlyIds.has(m.rule.id);
      const blockMatch = matches.find(
        (m) => canHardDeny(m) && (!stableOnlyDeny || m.rule.maturity === 'stable')
      );
      const heldBack = !blockMatch && stableOnlyDeny && matches.some(canHardDeny);
      const askMatch =
        blockMatch ??
        matches.find((m) => m.rule.severity === 'high' || m.rule.severity === 'critical');
      const outcome: EvalResult['outcome'] = blockMatch ? 'deny' : askMatch ? 'ask' : 'allow';
      const topMatch = blockMatch ?? askMatch ?? matches[0]!;

      // An 'ask' is advise-only-driven when NO trusted (non-advise-only)
      // high/critical rule justifies it — i.e. the only rules asking for
      // attention are fresh, untrusted auto-pulled ones. The caller must not
      // escalate such an 'ask' to a block. A 'deny' is never advise-only (the
      // block gate above already excluded advise-only rules).
      const adviseOnly =
        outcome === 'ask' &&
        !matches.some(
          (m) =>
            (m.rule.severity === 'high' || m.rule.severity === 'critical') &&
            !this.adviseOnlyIds.has(m.rule.id)
        );

      return {
        outcome,
        reason:
          outcome === 'allow'
            ? `No actionable threat (low-severity match suppressed: ${topMatch.rule.title}, ${topMatch.rule.severity})`
            : `${topMatch.rule.title} (${topMatch.rule.severity})${heldBack ? LONG_RESPONSE_ADVISORY : ''}`,
        matchedRules: matches.map((m) => m.rule.id),
        confidence: outcome === 'allow' ? 0 : topMatch.confidence,
        durationMs,
        adviseOnly,
      };
    } catch (err: unknown) {
      // Fail-closed: if evaluation crashes, deny the call (security-first)
      process.stderr.write(
        `[panguard-proxy] Evaluation error (fail-closed): ${err instanceof Error ? err.message : String(err)}\n`
      );
      return {
        outcome: 'deny',
        reason: 'Evaluation error (fail-closed for safety)',
        matchedRules: [EVALUATION_ERROR_SENTINEL],
        confidence: 100,
        durationMs: Date.now() - start,
        adviseOnly: false,
      };
    }
  }
}
