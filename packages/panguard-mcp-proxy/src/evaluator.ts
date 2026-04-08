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
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** Find bundled ATR rules directory from agent-threat-rules npm package */
function findRulesDir(): string {
  // Strategy 1: resolve agent-threat-rules main, walk up to package root
  try {
    const atrMain = require.resolve('agent-threat-rules');
    let dir = dirname(atrMain);
    for (let depth = 0; depth < 5; depth++) {
      if (existsSync(resolve(dir, 'rules')) && existsSync(resolve(dir, 'package.json'))) {
        return resolve(dir, 'rules');
      }
      dir = dirname(dir);
    }
  } catch {
    /* continue */
  }

  // Strategy 2: walk up from this module to find node_modules/agent-threat-rules/rules
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

export class ProxyEvaluator {
  private readonly engine: ATREngine;
  private rulesLoaded = false;
  private ruleCount = 0;

  constructor() {
    const rulesDir = findRulesDir();
    this.engine = new ATREngine({ rulesDir });
  }

  async loadRules(): Promise<number> {
    if (this.rulesLoaded) return this.ruleCount;
    this.ruleCount = await this.engine.loadRules();
    this.rulesLoaded = true;
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

      // Check highest severity match
      const maxSeverity = matches.reduce((max, m) => {
        const order = ['informational', 'low', 'medium', 'high', 'critical'];
        return order.indexOf(m.rule.severity) > order.indexOf(max) ? m.rule.severity : max;
      }, 'informational');

      const outcome = maxSeverity === 'critical' || maxSeverity === 'high' ? 'deny' : 'ask';
      const topMatch = matches[0]!;

      return {
        outcome,
        reason: `${topMatch.rule.title} (${topMatch.rule.severity})`,
        matchedRules: matches.map((m) => m.rule.id),
        confidence: topMatch.confidence,
        durationMs,
      };
    } catch {
      // Fail-open: if evaluation crashes, allow the call
      return {
        outcome: 'allow',
        reason: 'Evaluation error (fail-open)',
        matchedRules: [],
        confidence: 0,
        durationMs: Date.now() - start,
      };
    }
  }
}
