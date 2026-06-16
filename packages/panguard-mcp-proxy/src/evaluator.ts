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
}

/** Minimal rule shape the deny policy needs. */
interface RuleLike {
  readonly severity: string;
  readonly maturity?: string;
  readonly confirm?: string;
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
export function shouldHardDeny(rule: RuleLike): boolean {
  if (rule.confirm === 'embedding') return false;
  if (rule.severity === 'critical') return true;
  return rule.severity === 'high' && rule.maturity === 'stable';
}

export class ProxyEvaluator {
  private readonly engine: ATREngine;
  private rulesLoaded = false;
  private ruleCount = 0;
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

  getRuleCount(): number {
    return this.ruleCount;
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

  /** Evaluate a tool call (PreToolUse) */
  async evaluateToolCall(toolName: string, args: Record<string, unknown>): Promise<EvalResult> {
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
      };
    }

    // Flatten args into natural text so ATR regexes can match content like paths and commands
    const flatContent = `${toolName} ${this.flattenArgs(args)}`;
    const event: AgentEvent = {
      type: 'mcp_exchange' as AgentEvent['type'],
      timestamp: new Date().toISOString(),
      content: flatContent,
      fields: {
        tool_name: toolName,
        tool_input: flatContent,
      },
    };

    return this.evaluate(event, start);
  }

  /** Evaluate a tool response (PostToolUse) */
  async evaluateToolResponse(toolName: string, response: string): Promise<EvalResult> {
    const start = Date.now();
    const event: AgentEvent = {
      type: 'mcp_exchange' as AgentEvent['type'],
      timestamp: new Date().toISOString(),
      content: response,
      fields: {
        tool_name: toolName,
        tool_response: response,
      },
    };

    return this.evaluate(event, start);
  }

  private async evaluate(event: AgentEvent, start: number): Promise<EvalResult> {
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
        };
      }

      // Hard-DENY only on a trusted match (see shouldHardDeny); every other
      // match is still surfaced as 'ask' (user-in-the-loop), never silently
      // allowed. This is the proxy's false-positive control point — the engine
      // runs full 'hunt' detection so nothing is missed.
      const blockMatch = matches.find((m) => shouldHardDeny(m.rule));
      const outcome: EvalResult['outcome'] = blockMatch ? 'deny' : 'ask';
      const topMatch = blockMatch ?? matches[0]!;

      return {
        outcome,
        reason: `${topMatch.rule.title} (${topMatch.rule.severity})`,
        matchedRules: matches.map((m) => m.rule.id),
        confidence: topMatch.confidence,
        durationMs,
      };
    } catch (err: unknown) {
      // Fail-closed: if evaluation crashes, deny the call (security-first)
      process.stderr.write(
        `[panguard-proxy] Evaluation error (fail-closed): ${err instanceof Error ? err.message : String(err)}\n`
      );
      return {
        outcome: 'deny',
        reason: 'Evaluation error (fail-closed for safety)',
        matchedRules: ['evaluation-error'],
        confidence: 100,
        durationMs: Date.now() - start,
      };
    }
  }
}
