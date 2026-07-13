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
  readonly tags?: { readonly scan_target?: string };
}

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
  if (builtinToolSurface && rule.tags?.scan_target === 'mcp') {
    // FALSE-POSITIVE gate for the built-in-tool hook, which guards the agent's
    // OWN native shell (Bash/Edit/Write/WebFetch). Rules scoped scan_target:mcp
    // are MCP-tool-ARGUMENT rules — e.g. ATR-2026-00111 "Shell Metacharacter
    // Injection in Tool Arguments" / ATR-2026-00066 "Parameter Injection" — that
    // key on shell metacharacters (`;` `|` `$()`). Inside an MCP argument those
    // are anomalous and rightly deny; but they are the NORMAL grammar of a real
    // shell, so matched against the agent's own `echo x; curl localhost` they
    // false-block legitimate work (they only reach a tool_call event at all via
    // the engine's mcp-over-tool exception). On this surface an mcp-scoped rule
    // therefore DEGRADES to an 'ask' advisory — the caller warns, never bricks
    // the agent. Semantic exfil/RCE rules scoped to the shell's real domain
    // (tool_args / skill / host / code / any) still hard-block, so credential
    // exfil (`cat ~/.ssh/id_rsa | curl`, `env | curl`) is caught regardless of
    // this gate. The MCP proxy leaves builtinToolSurface=false: on a genuine MCP
    // ARGUMENT, `; curl` really is injection. This keys on scan_target (a rule's
    // intrinsic scope), NOT maturity — so it never drifts with the daily corpus.
    return false;
  }
  if (rule.severity === 'critical') return true;
  return rule.severity === 'high' && rule.maturity === 'stable';
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

    return this.evaluate(event, start, builtinToolSurface);
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
   */
  async evaluateToolResponse(toolName: string, response: string): Promise<EvalResult> {
    const start = Date.now();
    const event: AgentEvent = {
      type: 'tool_response',
      timestamp: new Date().toISOString(),
      content: response,
      fields: {
        tool_name: toolName,
        tool_response: response,
      },
    };

    return this.evaluate(event, start);
  }

  private async evaluate(
    event: AgentEvent,
    start: number,
    builtinToolSurface = false
  ): Promise<EvalResult> {
    try {
      const matches = this.engine.evaluate(event);
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
      const blockMatch = matches.find(
        (m) => shouldHardDeny(m.rule, builtinToolSurface) && !this.adviseOnlyIds.has(m.rule.id)
      );
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
            : `${topMatch.rule.title} (${topMatch.rule.severity})`,
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
