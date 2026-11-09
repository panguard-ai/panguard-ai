/**
 * EngineWorker — one ATR engine in a worker thread, so an evaluation can be cut
 * at a deadline.
 *
 * An evaluation still running at its deadline is cut by terminating the
 * worker. The next call starts a fresh worker with the same bundled and
 * auto-pulled rules.
 *
 * Calls are served one at a time, in order. A call's deadline starts when the
 * worker picks it up, not while it waits behind another call.
 *
 * @module @panguard-ai/panguard-mcp-proxy/engine-worker
 */

import { Worker } from 'node:worker_threads';
import type { AgentEvent } from 'agent-threat-rules';

/** Thrown when an evaluation runs past its deadline. The worker that ran it is terminated. */
export class EvaluationDeadlineError extends Error {
  constructor(readonly deadlineMs: number) {
    super(`ATR evaluation exceeded its ${deadlineMs} ms time limit`);
    this.name = 'EvaluationDeadlineError';
  }
}

/**
 * Thrown when the worker could not be started, or stopped during a call, so the
 * evaluation did not run. An exception thrown by the engine itself is not this:
 * it is reported as a plain Error, as it would be on the calling thread.
 */
export class EngineWorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineWorkerError';
  }
}

/** The fields of an ATR match the deny policy reads. Plain data, so it crosses the thread boundary. */
export interface EngineMatch {
  readonly rule: {
    readonly id: string;
    readonly title: string;
    readonly severity: string;
    readonly maturity?: string;
    readonly confirm?: string;
    readonly tags?: { readonly scan_target?: string; readonly subcategory?: string };
  };
  readonly confidence: number;
}

/** What a (re)started worker holds: the bundled rule count and the ids each auto-rules load added. */
export interface EngineWorkerState {
  readonly ruleCount: number;
  readonly autoRules: ReadonlyArray<{
    readonly adviseOnly: boolean;
    readonly added: readonly string[];
  }>;
}

export interface EngineWorkerOptions {
  /** file: URL of the agent-threat-rules entry module the worker imports. */
  readonly engineUrl: string;
  readonly rulesDir: string;
  /** Called with the new state after every start, including restarts after a cut. */
  readonly onStart?: (state: EngineWorkerState) => void;
}

/** Loading rules is not cut by an evaluation deadline, but a worker that never answers must not hang its caller. */
const LOAD_TIMEOUT_MS = 60_000;

// The worker body, run as an eval worker so it needs no separate file on disk:
// the compiled package, vitest running src/, and the installed CLI all spawn the
// same code. It imports the engine from the URL the main thread resolved. An eval
// worker is parsed as a module or as a script depending on how the parent process
// was started, so the body uses only import() — no require, no import statement.
const WORKER_SOURCE = `
const pick = (m) => ({
  rule: {
    id: m.rule.id,
    title: m.rule.title,
    severity: m.rule.severity,
    maturity: m.rule.maturity,
    confirm: m.rule.confirm,
    tags: m.rule.tags
      ? { scan_target: m.rule.tags.scan_target, subcategory: m.rule.tags.subcategory }
      : undefined,
  },
  confidence: m.confidence,
});
const message = (err) => (err && err.message) || String(err);
import('node:worker_threads').then(async ({ parentPort, workerData }) => {
  try {
    await serve(parentPort, workerData);
  } catch (err) {
    parentPort.postMessage({ ready: false, error: message(err) });
  }
});
async function serve(parentPort, workerData) {
  const { ATREngine } = await import(workerData.engineUrl);
  const engine = new ATREngine({ rulesDir: workerData.rulesDir });
  const ruleCount = await engine.loadRules();
  const addAutoRules = async (dir) => {
    const existing = new Set(engine.getRules().map((r) => r.id));
    const sub = new ATREngine({ rulesDir: dir });
    await sub.loadRules();
    const added = [];
    for (const rule of sub.getRules()) {
      if (existing.has(rule.id)) continue;
      engine.addRule(rule);
      added.push(rule.id);
    }
    return added;
  };
  const autoRules = [];
  for (const load of workerData.autoRules) {
    autoRules.push({ adviseOnly: load.adviseOnly, added: await addAutoRules(load.dir) });
  }
  parentPort.on('message', async (msg) => {
    try {
      if (msg.type === 'evaluate') {
        const matches = msg.events.flatMap((e) => engine.evaluate(e)).map(pick);
        parentPort.postMessage({ id: msg.id, matches });
      } else if (msg.type === 'autoRules') {
        parentPort.postMessage({ id: msg.id, added: await addAutoRules(msg.dir) });
      }
    } catch (err) {
      parentPort.postMessage({ id: msg.id, error: message(err) });
    }
  });
  parentPort.postMessage({ ready: true, ruleCount, autoRules });
}
`;

type Reply = { readonly id?: number; readonly ready?: boolean; readonly error?: string } & Record<
  string,
  unknown
>;

export class EngineWorker {
  private worker: Worker | null = null;
  private state: EngineWorkerState = { ruleCount: 0, autoRules: [] };
  private autoRuleLoads: ReadonlyArray<{ readonly dir: string; readonly adviseOnly: boolean }> = [];
  /** Bundled rules the first worker loaded; a restarted worker must load at least as many. */
  private firstRuleCount: number | undefined;
  private nextId = 0;
  private tail: Promise<unknown> = Promise.resolve();
  /** Calls waiting on the worker right now. */
  private active = 0;

  constructor(private readonly options: EngineWorkerOptions) {}

  /** Start the worker if it is not running; resolves once it has loaded its rules. */
  start(): Promise<EngineWorkerState> {
    return this.serve(async () => {
      await this.ensureWorker();
      return this.state;
    });
  }

  /** Evaluate events in the worker. Rejects with EvaluationDeadlineError if it runs past `deadlineMs`. */
  evaluate(events: readonly AgentEvent[], deadlineMs: number): Promise<EngineMatch[]> {
    return this.serve(async () => {
      const worker = await this.ensureWorker();
      const reply = await this.request(
        worker,
        { type: 'evaluate', events },
        deadlineMs,
        () => new EvaluationDeadlineError(deadlineMs)
      );
      return reply['matches'] as EngineMatch[];
    });
  }

  /** Merge an auto-pulled rules directory into the engine; resolves with the ids it added. */
  loadAutoRules(dir: string, adviseOnly: boolean): Promise<string[]> {
    return this.serve(async () => {
      const worker = await this.ensureWorker();
      const reply = await this.request(
        worker,
        { type: 'autoRules', dir },
        LOAD_TIMEOUT_MS,
        () => new EngineWorkerError('ATR worker did not load the auto-pulled rules in time')
      );
      const added = reply['added'] as string[];
      this.autoRuleLoads = [...this.autoRuleLoads, { dir, adviseOnly }];
      this.state = { ...this.state, autoRules: [...this.state.autoRules, { adviseOnly, added }] };
      return added;
    });
  }

  /** Terminate the worker after the calls already queued. A later call starts a new one. */
  close(): Promise<void> {
    return this.serve(async () => {
      const worker = this.worker;
      this.worker = null;
      if (worker) await worker.terminate();
    });
  }

  /** Run calls one at a time, in order; a failed call does not stop the ones queued behind it. */
  private serve<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(task);
    this.tail = run.catch(() => undefined);
    return run;
  }

  private ensureWorker(): Promise<Worker> {
    return this.worker ? Promise.resolve(this.worker) : this.spawn();
  }

  private async spawn(): Promise<Worker> {
    let worker: Worker;
    try {
      worker = new Worker(WORKER_SOURCE, {
        eval: true,
        workerData: {
          engineUrl: this.options.engineUrl,
          rulesDir: this.options.rulesDir,
          autoRules: this.autoRuleLoads,
        },
      });
    } catch (err) {
      throw new EngineWorkerError(
        `could not create an ATR worker: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    // An idle worker must not keep the process alive. A call in flight still
    // does, through the timer it waits on.
    worker.unref();
    // Kept for the worker's whole life: an 'error' event with no listener would
    // throw on this thread, and a worker that dies while idle must not be handed
    // the next call. An error during a call is reported by that call instead.
    worker.on('error', (err) => {
      if (this.active === 0) {
        process.stderr.write(`[panguard-proxy] ATR worker failed while idle: ${err.message}\n`);
      }
      this.discard(worker);
    });
    worker.once('exit', () => this.discard(worker));
    try {
      const reply = await this.awaitMessage(
        worker,
        (msg) => msg.ready !== undefined,
        LOAD_TIMEOUT_MS,
        () => new EngineWorkerError('ATR worker did not start in time')
      );
      if (!reply.ready) {
        throw new EngineWorkerError(
          `ATR worker failed to start: ${reply.error ?? 'unknown error'}`
        );
      }
      const state: EngineWorkerState = {
        ruleCount: reply['ruleCount'] as number,
        autoRules: reply['autoRules'] as EngineWorkerState['autoRules'],
      };
      // A restart reads the rules from disk again. Fewer than the first worker
      // loaded means the package changed or went missing underneath this
      // process, and scanning on would quietly catch less.
      if (this.firstRuleCount !== undefined && state.ruleCount < this.firstRuleCount) {
        throw new EngineWorkerError(
          `ATR worker restarted with ${state.ruleCount} bundled rules, fewer than the ` +
            `${this.firstRuleCount} it first loaded; restart this process`
        );
      }
      this.firstRuleCount ??= state.ruleCount;
      this.state = state;
      this.worker = worker;
      this.options.onStart?.(state);
      return worker;
    } catch (err) {
      this.discard(worker);
      throw err;
    }
  }

  private async request(
    worker: Worker,
    msg: Record<string, unknown>,
    timeoutMs: number,
    onTimeout: () => Error
  ): Promise<Reply> {
    const id = this.nextId++;
    const reply = await this.awaitMessage(
      worker,
      (r) => r.id === id,
      timeoutMs,
      onTimeout,
      () => worker.postMessage({ ...msg, id })
    );
    if (reply.error !== undefined) throw new Error(reply.error);
    return reply;
  }

  /**
   * The first message `match` accepts, listening before `send` runs. Rejects if
   * `send` throws or the worker fails or exits first, or with onTimeout() after
   * `timeoutMs`, which also terminates the worker.
   */
  private awaitMessage(
    worker: Worker,
    match: (msg: Reply) => boolean,
    timeoutMs: number,
    onTimeout: () => Error,
    send: () => void = () => undefined
  ): Promise<Reply> {
    this.active++;
    return new Promise<Reply>((resolve, reject) => {
      const settle = (finish: () => void) => {
        clearTimeout(timer);
        worker.off('message', onMessage);
        worker.off('error', onFailure);
        worker.off('exit', onFailure);
        this.active--;
        finish();
      };
      const onMessage = (msg: Reply) => {
        if (match(msg)) settle(() => resolve(msg));
      };
      const onFailure = (err?: unknown) =>
        settle(() =>
          reject(
            new EngineWorkerError(
              err instanceof Error
                ? `ATR worker failed: ${err.message}`
                : `ATR worker exited (code ${String(err)})`
            )
          )
        );
      const timer = setTimeout(() => {
        settle(() => reject(onTimeout()));
        this.discard(worker);
      }, timeoutMs);
      worker.on('message', onMessage);
      worker.on('error', onFailure);
      worker.on('exit', onFailure);
      try {
        send();
      } catch (err) {
        settle(() => reject(err));
      }
    });
  }

  /** Drop a worker that ran past a deadline or died; the next call starts a fresh one. */
  private discard(worker: Worker): void {
    if (this.worker === worker) this.worker = null;
    void worker.terminate();
  }
}
