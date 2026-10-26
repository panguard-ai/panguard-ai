/**
 * Messages between the gateway and its ATR worker threads.
 *
 * @module @panguard-ai/panguard-gateway/worker/protocol
 */

import type { AgentEvent } from 'agent-threat-rules';
import type { EvalResult } from '@panguard-ai/panguard-mcp-proxy/evaluator';
import type { Coverage, WindowOptions } from '../windows.js';

export type Lane = 'hunt' | 'alert' | 'enforce';

/**
 * Which engine evaluates the event. Tool definitions from tools[] go to an
 * engine built with `toolDefinitions: true`, so rules written for a tool being
 * called do not run on a definition (measured: one false positive on a benign
 * `delete_file` definition without it).
 */
export type EngineKind = 'runtime' | 'tool-definitions';

export interface WorkerInit {
  readonly lane: Lane;
  readonly windows: WindowOptions;
  /** Guard blocklist; undefined keeps ProxyEvaluator's default path. */
  readonly blocklistPath?: string;
}

export interface EvaluateRequest {
  readonly id: number;
  readonly engine: EngineKind;
  readonly event: AgentEvent;
}

export interface RuleCounts {
  readonly runtime: number;
  readonly toolDefinitions: number;
}

export interface WindowedResult {
  /** Verdict over the windows the engine evaluated; undefined if none did. */
  readonly result: EvalResult | undefined;
  readonly windows: number;
  readonly coverage: Coverage;
  /** At least one window hit an engine error (ProxyEvaluator's fail-closed sentinel). */
  readonly engineError: boolean;
}

export type WorkerMessage =
  | { readonly kind: 'ready'; readonly rules: RuleCounts }
  | { readonly kind: 'fatal'; readonly error: string }
  | { readonly kind: 'result'; readonly id: number; readonly result: WindowedResult }
  | { readonly kind: 'error'; readonly id: number; readonly error: string };
