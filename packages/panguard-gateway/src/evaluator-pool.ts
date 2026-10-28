/**
 * Main-thread side of the ATR workers: a small pool with a hard deadline per
 * evaluation. A worker that misses the deadline is terminated and replaced; the
 * caller gets a failure and applies its fail mode.
 *
 * @module @panguard-ai/panguard-gateway/evaluator-pool
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import type { AgentEvent } from 'agent-threat-rules';
import type { EvalResult } from '@panguard-ai/panguard-mcp-proxy/evaluator';
import type { Coverage } from './windows.js';
import type {
  EngineKind,
  EvaluateRequest,
  Lane,
  RuleCounts,
  WindowedResult,
  WorkerInit,
  WorkerMessage,
} from './worker/protocol.js';

/** What one evaluation produced: a verdict, or a reason there is none. */
export type Evaluation =
  | {
      readonly kind: 'result';
      readonly result: EvalResult;
      readonly windows: number;
      readonly coverage: Coverage;
      readonly durationMs: number;
    }
  | { readonly kind: 'failure'; readonly reason: string; readonly durationMs: number };

/** The gateway's view of an evaluator; tests substitute an in-process one. */
export interface Evaluator {
  evaluate(engine: EngineKind, event: AgentEvent): Promise<Evaluation>;
}

export interface EvaluatorPoolOptions {
  readonly lane: Lane;
  /** Characters scanned per text (see windows.ts). */
  readonly maxScanChars: number;
  /** Worker threads; each holds both engines (about 0.3 s to load on hunt). */
  readonly size: number;
  /** Hard deadline for one evaluation, measured from dispatch to the worker. */
  readonly timeoutMs: number;
  readonly blocklistPath?: string;
  /** Evaluations allowed to wait for a free worker before new ones fail. */
  readonly maxQueue?: number;
  /** Deadline for a worker to load its rules. */
  readonly startupTimeoutMs?: number;
  /** Longest an evaluation may wait for a free worker; default 4 x timeoutMs, at least 10 s. */
  readonly maxWaitMs?: number;
  /** Worker entry; defaults to the compiled worker next to this module. */
  readonly workerUrl?: URL;
}

interface Job {
  readonly request: EvaluateRequest;
  readonly resolve: (evaluation: Evaluation) => void;
  readonly queuedAt: number;
  readonly waitTimer: NodeJS.Timeout;
}

interface Slot {
  readonly worker: Worker;
  readonly ready: boolean;
  readonly job: (Job & { readonly timer: NodeJS.Timeout; readonly sentAt: number }) | undefined;
}

const DEFAULT_MAX_QUEUE = 1_000;
const DEFAULT_STARTUP_TIMEOUT_MS = 30_000;
/** Respawns allowed in a row without a worker reaching ready. */
const MAX_FAILED_RESPAWNS = 3;
/** First and longest pause before trying to bring workers back after giving up. */
const RECOVERY_BASE_MS = 5_000;
const RECOVERY_MAX_MS = 60_000;

/**
 * The worker runs compiled JavaScript: next to this module in dist/, or, when
 * this module runs from src/ (the test suite), from the package build. A loader
 * such as tsx does not reach a worker thread's imports on Node 24, so the
 * TypeScript source is not an option.
 */
function resolveWorker(explicit: URL | undefined): URL {
  if (explicit) return explicit;
  const candidates = [
    new URL('./worker/atr-worker.js', import.meta.url),
    new URL('../dist/worker/atr-worker.js', import.meta.url),
  ];
  const found = candidates.find((url) => existsSync(fileURLToPath(url)));
  if (!found) {
    throw new Error(
      'ATR worker is not built: run `pnpm --filter @panguard-ai/panguard-gateway build`'
    );
  }
  return found;
}

export class WorkerEvaluatorPool implements Evaluator {
  private readonly options: EvaluatorPoolOptions;
  private readonly entry: URL;
  private slots: ReadonlyMap<number, Slot> = new Map();
  private queue: readonly Job[] = [];
  private nextId = 1;
  private nextSlot = 0;
  private failedRespawns = 0;
  private started = false;
  private closed = false;
  /** Gave up respawning: evaluations fail at once until a recovery attempt succeeds. */
  private exhausted = false;
  private recoveryTimer: NodeJS.Timeout | undefined;
  private recoveryDelay = RECOVERY_BASE_MS;
  private rules: RuleCounts = { runtime: 0, toolDefinitions: 0 };
  private atrVersion = 'unknown';
  private counters = { timeouts: 0, restarts: 0, crashes: 0 };

  constructor(options: EvaluatorPoolOptions) {
    this.options = options;
    this.entry = resolveWorker(options.workerUrl);
  }

  /** Start every worker and wait until each has loaded its rules. */
  async start(): Promise<RuleCounts> {
    let counts: readonly RuleCounts[];
    try {
      counts = await Promise.all(
        Array.from({ length: Math.max(1, this.options.size) }, () => this.spawn())
      );
    } catch (err) {
      await this.close();
      throw err;
    }
    const first = counts[0];
    if (!first || first.runtime === 0) {
      await this.close();
      throw new Error(
        '0 ATR rules loaded: the gateway would pass everything unchecked. ' +
          'Verify the agent-threat-rules package is installed with its rules directory.'
      );
    }
    this.rules = first;
    this.started = true;
    return first;
  }

  getRuleCounts(): RuleCounts {
    return this.rules;
  }

  /** The agent-threat-rules release the workers loaded. */
  getAtrVersion(): string {
    return this.atrVersion;
  }

  stats(): Readonly<{
    timeouts: number;
    restarts: number;
    crashes: number;
    queued: number;
    alive: number;
    exhausted: boolean;
  }> {
    const alive = [...this.slots.values()].filter((slot) => slot.ready).length;
    return { ...this.counters, queued: this.queue.length, alive, exhausted: this.exhausted };
  }

  evaluate(engine: EngineKind, event: AgentEvent): Promise<Evaluation> {
    if (this.closed) return Promise.resolve(failure('evaluator closed', 0));
    if (this.exhausted && this.slots.size === 0) {
      return Promise.resolve(failure('no ATR worker available', 0));
    }
    if (this.queue.length >= (this.options.maxQueue ?? DEFAULT_MAX_QUEUE)) {
      return Promise.resolve(failure('evaluator overloaded: queue full', 0));
    }
    return new Promise((resolve) => {
      const request: EvaluateRequest = { id: this.nextId++, engine, event };
      const maxWait = this.options.maxWaitMs ?? Math.max(4 * this.options.timeoutMs, 10_000);
      // The hard deadline starts at dispatch; this bounds the wait before it.
      const waitTimer = setTimeout(() => this.expire(request.id, maxWait), maxWait);
      this.queue = [...this.queue, { request, resolve, queuedAt: Date.now(), waitTimer }];
      this.dispatch();
    });
  }

  /** A queued evaluation waited too long for a worker. */
  private expire(id: number, maxWait: number): void {
    const job = this.queue.find((j) => j.request.id === id);
    if (!job) return;
    this.queue = this.queue.filter((j) => j !== job);
    job.resolve(failure(`waited ${maxWait} ms for an ATR worker`, Date.now() - job.queuedAt));
  }

  async close(): Promise<void> {
    this.closed = true;
    clearTimeout(this.recoveryTimer);
    const pending = this.queue;
    this.queue = [];
    for (const job of pending) {
      clearTimeout(job.waitTimer);
      job.resolve(failure('evaluator closed', 0));
    }
    const slots = [...this.slots.values()];
    this.slots = new Map();
    for (const slot of slots) {
      if (slot.job) {
        clearTimeout(slot.job.timer);
        slot.job.resolve(failure('evaluator closed', Date.now() - slot.job.sentAt));
      }
    }
    await Promise.all(slots.map((slot) => slot.worker.terminate()));
  }

  private spawn(): Promise<RuleCounts> {
    const key = this.nextSlot++;
    const init: WorkerInit = {
      lane: this.options.lane,
      maxScanChars: this.options.maxScanChars,
      ...(this.options.blocklistPath !== undefined
        ? { blocklistPath: this.options.blocklistPath }
        : {}),
    };
    const worker = new Worker(this.entry, { workerData: init });
    this.setSlot(key, { worker, ready: false, job: undefined });

    return new Promise<RuleCounts>((resolve, reject) => {
      const startup = setTimeout(() => {
        reject(new Error(`ATR worker did not load its rules within ${this.startupTimeout()} ms`));
        this.retire(key, 'startup timeout');
      }, this.startupTimeout());
      worker.on('message', (message: WorkerMessage) => {
        if (message.kind === 'ready') {
          clearTimeout(startup);
          this.failedRespawns = 0;
          this.updateSlot(key, (slot) => ({ ...slot, ready: true }));
          this.atrVersion = message.atrVersion;
          resolve(message.rules);
          this.dispatch();
        } else if (message.kind === 'fatal') {
          clearTimeout(startup);
          reject(new Error(`ATR worker failed to start: ${message.error}`));
          this.retire(key, message.error);
        } else {
          this.settle(key, message);
        }
      });
      worker.on('error', (err) => {
        clearTimeout(startup);
        reject(err);
        this.retire(key, `worker error: ${err.message}`);
      });
      worker.on('exit', () => {
        clearTimeout(startup);
        reject(new Error('ATR worker exited before it was ready'));
        this.retire(key, 'worker exited');
      });
    });
  }

  private startupTimeout(): number {
    return this.options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;
  }

  private setSlot(key: number, slot: Slot): void {
    this.slots = new Map([...this.slots, [key, slot]]);
  }

  private updateSlot(key: number, change: (slot: Slot) => Slot): void {
    const slot = this.slots.get(key);
    if (slot) this.setSlot(key, change(slot));
  }

  private removeSlot(key: number): Slot | undefined {
    const slot = this.slots.get(key);
    if (!slot) return undefined;
    this.slots = new Map([...this.slots].filter(([k]) => k !== key));
    return slot;
  }

  /** Hand queued jobs to idle ready workers. */
  private dispatch(): void {
    for (const [key, slot] of this.slots) {
      if (!slot.ready || slot.job) continue;
      const [job, ...rest] = this.queue;
      if (!job) return;
      this.queue = rest;
      clearTimeout(job.waitTimer);
      const sentAt = Date.now();
      const timer = setTimeout(() => this.timeout(key), this.options.timeoutMs);
      this.setSlot(key, { ...slot, job: { ...job, timer, sentAt } });
      slot.worker.postMessage(job.request);
    }
  }

  private settle(key: number, message: Extract<WorkerMessage, { id: number }>): void {
    const slot = this.slots.get(key);
    const job = slot?.job;
    if (!slot || !job || job.request.id !== message.id) return;
    clearTimeout(job.timer);
    this.setSlot(key, { ...slot, job: undefined });
    const durationMs = Date.now() - job.queuedAt;
    job.resolve(
      message.kind === 'result'
        ? fromWindowed(message.result, durationMs)
        : failure(`evaluation error: ${message.error}`, durationMs)
    );
    this.dispatch();
  }

  /** The deadline passed: fail the job, kill the worker, start a replacement. */
  private timeout(key: number): void {
    const slot = this.slots.get(key);
    if (!slot?.job) return;
    this.counters = { ...this.counters, timeouts: this.counters.timeouts + 1 };
    this.retire(key, `evaluation exceeded ${this.options.timeoutMs} ms`);
  }

  /** Remove a worker, fail its in-flight job, and replace it unless the pool is closing. */
  private retire(key: number, reason: string): void {
    const slot = this.removeSlot(key);
    if (!slot) return;
    if (slot.job) {
      clearTimeout(slot.job.timer);
      slot.job.resolve(failure(reason, Date.now() - slot.job.queuedAt));
    }
    slot.worker.removeAllListeners();
    slot.worker.on('error', () => undefined);
    void slot.worker.terminate();
    // Before start() succeeds a failure is start()'s to report, not a reason to respawn.
    if (this.closed || !this.started) return;
    if (!slot.ready) this.failedRespawns += 1;
    else this.counters = { ...this.counters, crashes: this.counters.crashes + 1 };
    if (this.failedRespawns > MAX_FAILED_RESPAWNS) {
      this.exhausted = true;
      this.failQueueIfNoWorker(`ATR workers keep failing to start (${reason})`);
      this.scheduleRecovery();
      return;
    }
    this.counters = { ...this.counters, restarts: this.counters.restarts + 1 };
    this.spawn().catch((err: unknown) => {
      process.stderr.write(
        `[panguard-gateway] ATR worker restart failed: ${err instanceof Error ? err.message : String(err)}\n`
      );
      this.failQueueIfNoWorker('no ATR worker available');
    });
  }

  private failQueueIfNoWorker(reason: string): void {
    if (this.slots.size > 0) return;
    const pending = this.queue;
    this.queue = [];
    for (const job of pending) {
      clearTimeout(job.waitTimer);
      job.resolve(failure(reason, Date.now() - job.queuedAt));
    }
  }

  /**
   * After giving up, try one worker again later, backing off up to a minute.
   * A failed attempt comes back through retire(), which schedules the next one.
   */
  private scheduleRecovery(): void {
    if (this.closed || this.recoveryTimer) return;
    const delay = this.recoveryDelay;
    this.recoveryDelay = Math.min(delay * 2, RECOVERY_MAX_MS);
    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = undefined;
      this.spawn().then(
        () => {
          this.exhausted = false;
          this.failedRespawns = 0;
          this.recoveryDelay = RECOVERY_BASE_MS;
        },
        () => undefined
      );
    }, delay);
    this.recoveryTimer.unref();
  }
}

function failure(reason: string, durationMs: number): Evaluation {
  return { kind: 'failure', reason, durationMs };
}

function fromWindowed(windowed: WindowedResult, durationMs: number): Evaluation {
  if (!windowed.result) return failure('ATR engine error on every window', durationMs);
  if (windowed.engineError && windowed.result.outcome !== 'deny') {
    return failure('ATR engine error on part of the input', durationMs);
  }
  return {
    kind: 'result',
    result: windowed.result,
    windows: windowed.windows,
    coverage: windowed.coverage,
    durationMs,
  };
}
