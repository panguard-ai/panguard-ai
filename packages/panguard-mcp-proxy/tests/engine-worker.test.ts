/**
 * EngineWorker — the worker-thread wrapper the ProxyEvaluator uses in worker
 * mode, driven here with a stand-in engine module so each failure can be
 * triggered on purpose: a scan that runs long, a worker that exits while
 * idle or mid-call, an engine that throws, rules that fail to load or shrink
 * between starts.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EngineWorker, EngineWorkerError, EvaluationDeadlineError } from '../src/engine-worker.js';
import type { EngineWorkerState } from '../src/engine-worker.js';
import type { AgentEvent } from 'agent-threat-rules';

// Rules are ids; an event matches every rule whose id its content contains. A
// rules dir ending in "auto" holds FAKE-AUTO, one ending in "broken" fails to
// load, one holding a count file holds that many rules, any other holds FAKE-1.
const FAKE_ENGINE = `
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const FAKE_1 = {
  id: 'FAKE-1', title: 'Fake one', severity: 'critical', maturity: 'stable', confirm: 'embedding',
  tags: { scan_target: 'mcp', subcategory: 'shell-escape', category: 'dropped' }, extra: 'dropped',
};
export class ATREngine {
  constructor({ rulesDir }) { this.rulesDir = rulesDir; this.rules = []; }
  async loadRules() {
    if (this.rulesDir.endsWith('broken')) throw new Error('cannot read rules');
    const countFile = join(this.rulesDir, 'count');
    if (existsSync(countFile)) {
      const n = Number(readFileSync(countFile, 'utf8'));
      this.rules = Array.from({ length: n }, (_, i) => ({ ...FAKE_1, id: 'FAKE-' + (i + 1) }));
    } else {
      this.rules = [this.rulesDir.endsWith('auto') ? { id: 'FAKE-AUTO', title: 'Fake auto', severity: 'high' } : FAKE_1];
    }
    return this.rules.length;
  }
  getRules() { return this.rules; }
  addRule(rule) { this.rules.push(rule); }
  evaluate(event) {
    if (event.content === 'spin') for (;;) {}
    if (event.content === 'throw') throw new Error('engine blew up');
    if (event.content === 'exit-now') process.exit(3);
    if (event.content === 'exit-soon') setTimeout(() => process.exit(3), 20);
    return this.rules
      .filter((r) => event.content.includes(r.id))
      .map((rule) => ({ rule, confidence: 90, matchedPatterns: ['dropped'] }));
  }
}
`;

const event = (content: string): AgentEvent => ({
  type: 'tool_call',
  timestamp: '2026-10-27T00:00:00.000Z',
  content,
});

let root: string;
let engineUrl: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'pg-engine-worker-'));
  const enginePath = join(root, 'fake-engine.mjs');
  writeFileSync(enginePath, FAKE_ENGINE);
  engineUrl = pathToFileURL(enginePath).href;
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const open: EngineWorker[] = [];
function engineWorker(onStart?: (state: EngineWorkerState) => void): EngineWorker {
  const w = new EngineWorker({ engineUrl, rulesDir: join(root, 'bundled'), onStart });
  open.push(w);
  return w;
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((w) => w.close()));
});

describe('EngineWorker', () => {
  it('evaluates in the worker and returns only the match fields the deny policy reads', async () => {
    const w = engineWorker();
    expect((await w.start()).ruleCount).toBe(1);
    expect(await w.evaluate([event('has FAKE-1')], 5_000)).toEqual([
      {
        rule: {
          id: 'FAKE-1',
          title: 'Fake one',
          severity: 'critical',
          maturity: 'stable',
          confirm: 'embedding',
          tags: { scan_target: 'mcp', subcategory: 'shell-escape' },
        },
        confidence: 90,
      },
    ]);
  });

  it('cuts a call at its deadline and serves the next on a fresh worker with the same rules', async () => {
    const starts: EngineWorkerState[] = [];
    const w = engineWorker((s) => starts.push(s));
    await w.start();
    expect(await w.loadAutoRules(join(root, 'auto'), true)).toEqual(['FAKE-AUTO']);
    const begin = Date.now();
    await expect(w.evaluate([event('spin')], 300)).rejects.toBeInstanceOf(EvaluationDeadlineError);
    expect(Date.now() - begin).toBeLessThan(3_000);
    const matches = await w.evaluate([event('FAKE-1 and FAKE-AUTO')], 5_000);
    expect(matches.map((m) => m.rule.id)).toEqual(['FAKE-1', 'FAKE-AUTO']);
    expect(starts).toEqual([
      { ruleCount: 1, autoRules: [] },
      { ruleCount: 1, autoRules: [{ adviseOnly: true, added: ['FAKE-AUTO'] }] },
    ]);
  });

  it('starts a call queued behind a slow one with its own full deadline', async () => {
    const w = engineWorker();
    await w.start();
    const slow = w.evaluate([event('spin')], 300);
    const next = w.evaluate([event('has FAKE-1')], 300);
    await expect(slow).rejects.toBeInstanceOf(EvaluationDeadlineError);
    expect((await next).map((m) => m.rule.id)).toEqual(['FAKE-1']);
  });

  it('starts a fresh worker when the last one exited while idle', async () => {
    const w = engineWorker();
    await w.start();
    expect(await w.evaluate([event('exit-soon')], 5_000)).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const begin = Date.now();
    expect((await w.evaluate([event('has FAKE-1')], 5_000)).map((m) => m.rule.id)).toEqual([
      'FAKE-1',
    ]);
    expect(Date.now() - begin).toBeLessThan(3_000);
  });

  it('fails a call whose worker exits mid-scan with EngineWorkerError, then recovers', async () => {
    const w = engineWorker();
    await w.start();
    await expect(w.evaluate([event('exit-now')], 5_000)).rejects.toBeInstanceOf(EngineWorkerError);
    expect((await w.evaluate([event('has FAKE-1')], 5_000)).map((m) => m.rule.id)).toEqual([
      'FAKE-1',
    ]);
  });

  it('refuses a restarted worker that loads fewer rules than the first one', async () => {
    const dir = join(root, 'shrinking');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'count'), '3');
    const w = new EngineWorker({ engineUrl, rulesDir: dir });
    open.push(w);
    expect((await w.start()).ruleCount).toBe(3);
    writeFileSync(join(dir, 'count'), '0');
    await expect(w.evaluate([event('spin')], 300)).rejects.toBeInstanceOf(EvaluationDeadlineError);
    const after = w.evaluate([event('FAKE-1')], 5_000);
    await expect(after).rejects.toBeInstanceOf(EngineWorkerError);
    await expect(after).rejects.toThrow('fewer than the 3 it first loaded');
    // Once the rules are back, the next call starts a worker that has them.
    writeFileSync(join(dir, 'count'), '3');
    expect((await w.evaluate([event('FAKE-1')], 5_000)).map((m) => m.rule.id)).toEqual(['FAKE-1']);
  });

  it('fails only the call whose evaluation threw', async () => {
    const w = engineWorker();
    await w.start();
    await expect(w.evaluate([event('throw')], 5_000)).rejects.toThrow('engine blew up');
    expect((await w.evaluate([event('has FAKE-1')], 5_000)).map((m) => m.rule.id)).toEqual([
      'FAKE-1',
    ]);
  });

  it('fails a call it cannot send without leaving its deadline running', async () => {
    const w = engineWorker();
    await w.start();
    const unsendable = { ...event('x'), fields: { f: () => 1 } } as unknown as AgentEvent;
    await expect(w.evaluate([unsendable], 200)).rejects.toThrow('could not be cloned');
    // Past that deadline: a timer left behind would reject with nobody
    // listening, which vitest reports as an unhandled rejection.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect((await w.evaluate([event('has FAKE-1')], 5_000)).map((m) => m.rule.id)).toEqual([
      'FAKE-1',
    ]);
  });

  it('rejects start() with EngineWorkerError when the engine cannot load its rules', async () => {
    const w = new EngineWorker({ engineUrl, rulesDir: join(root, 'broken') });
    open.push(w);
    const start = w.start();
    await expect(start).rejects.toBeInstanceOf(EngineWorkerError);
    await expect(start).rejects.toThrow('ATR worker failed to start: cannot read rules');
  });

  const dist = join(fileURLToPath(new URL('../', import.meta.url)), 'dist', 'engine-worker.js');
  it.runIf(existsSync(dist))(
    'keeps the process alive while a call is in flight, and not once it is idle',
    () => {
      // Nothing is awaited at the top level and the worker is never closed: the
      // child prints only if the pending call holds the process open, and exits
      // before the timeout only if the idle worker lets it go.
      const script = `
        import { EngineWorker } from ${JSON.stringify(pathToFileURL(dist).href)};
        const w = new EngineWorker({ engineUrl: ${JSON.stringify(engineUrl)}, rulesDir: 'bundled' });
        w.start()
          .then(() => w.evaluate([{ type: 'tool_call', timestamp: 't', content: 'FAKE-1' }], 5000))
          .then((m) => process.stdout.write(String(m.length)));
      `;
      const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        encoding: 'utf-8',
        timeout: 20_000,
      });
      expect(out).toBe('1');
    },
    30_000
  );
});
