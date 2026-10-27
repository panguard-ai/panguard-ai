/**
 * ATR worker thread.
 *
 * ATR evaluation is synchronous regex work, and some rules still go quadratic on
 * adversarial input (ATR #704/#723 fixed part of it). Running it here lets the
 * gateway enforce a hard deadline: past it the main thread terminates this
 * worker and starts a fresh one, which a timer on the same thread could not do.
 *
 * Both engines run behind ProxyEvaluator, so the deny policy (shouldHardDeny),
 * the advise-only gate, the Guard blocklist and fail-closed handling of engine
 * errors are the MCP proxy's own.
 *
 * @module @panguard-ai/panguard-gateway/worker/atr-worker
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parentPort, workerData } from 'node:worker_threads';
import { ATREngine } from 'agent-threat-rules';
import {
  EVALUATION_ERROR_SENTINEL,
  ProxyEvaluator,
  type EvalResult,
} from '@panguard-ai/panguard-mcp-proxy/evaluator';
import {
  canonicalArgs,
  functionCallEvent,
  functionCallOutputEvent,
  outputTextEvent,
  toolDefinitionEvent,
  userMessageEvent,
} from '../atr-events.js';
import { mergeEvalResults, scanPlan } from '../windows.js';
import type { EvaluateRequest, WindowedResult, WorkerInit, WorkerMessage } from './protocol.js';

const port = parentPort;
if (!port) throw new Error('atr-worker must run as a worker thread');

const init = workerData as WorkerInit;

function post(message: WorkerMessage): void {
  port?.postMessage(message);
}

/** The agent-threat-rules release this worker evaluates with (its exports hide package.json). */
function atrVersion(): string {
  try {
    const main = fileURLToPath(import.meta.resolve('agent-threat-rules'));
    const pkg = JSON.parse(readFileSync(join(dirname(main), '..', 'package.json'), 'utf8')) as {
      version?: unknown;
    };
    return typeof pkg.version === 'string' ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

function isEngineError(result: EvalResult): boolean {
  return result.matchedRules.includes(EVALUATION_ERROR_SENTINEL);
}

async function boot(): Promise<{ runtime: ProxyEvaluator; definitions: ProxyEvaluator }> {
  const evaluatorFor = (engine: ATREngine): ProxyEvaluator =>
    new ProxyEvaluator({
      engine,
      ...(init.blocklistPath !== undefined ? { blocklistPath: init.blocklistPath } : {}),
    });
  const runtime = evaluatorFor(new ATREngine({ lane: init.lane }));
  const definitions = evaluatorFor(new ATREngine({ lane: init.lane, toolDefinitions: true }));
  const [runtimeRules, definitionRules] = await Promise.all([
    runtime.loadRules(),
    definitions.loadRules(),
  ]);
  // Regexes compile on first use per rule (about 125 ms on hunt); pay that here,
  // once per event type, instead of on the first request under a hard deadline.
  const now = new Date().toISOString();
  const args = canonicalArgs('{"command":"warm-up"}');
  for (const event of [
    functionCallEvent('warm_up', args, now),
    functionCallOutputEvent({ name: 'warm_up', args }, 'warm-up', now),
    userMessageEvent('warm-up', now),
    outputTextEvent('warm-up', now),
  ]) {
    await runtime.evaluateEvent(event);
  }
  await definitions.evaluateEvent(
    toolDefinitionEvent({ name: 'warm_up', description: 'warm-up' }, now)
  );
  post({
    kind: 'ready',
    rules: { runtime: runtimeRules, toolDefinitions: definitionRules },
    atrVersion: atrVersion(),
  });
  return { runtime, definitions };
}

async function evaluate(evaluator: ProxyEvaluator, req: EvaluateRequest): Promise<WindowedResult> {
  const plan = scanPlan(req.event, init.maxScanChars);
  const results: EvalResult[] = [];
  for (const event of plan.events) results.push(await evaluator.evaluateEvent(event));
  const healthy = results.filter((r) => !isEngineError(r));
  return {
    result: mergeEvalResults(healthy),
    windows: plan.windows,
    coverage: plan.coverage,
    engineError: healthy.length < results.length,
  };
}

boot().then(
  (engines) => {
    port.on('message', (req: EvaluateRequest) => {
      const evaluator = req.engine === 'tool-definitions' ? engines.definitions : engines.runtime;
      evaluate(evaluator, req).then(
        (result) => post({ kind: 'result', id: req.id, result }),
        (err: unknown) =>
          post({
            kind: 'error',
            id: req.id,
            error: err instanceof Error ? err.message : String(err),
          })
      );
    });
  },
  (err: unknown) => post({ kind: 'fatal', error: err instanceof Error ? err.message : String(err) })
);
