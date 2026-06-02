import { describe, it, expect, vi } from 'vitest';
import { ResponseContainmentController } from '../../src/containment/response-controller.js';
import type {
  FileQuarantineLike,
  ProcessKillLike,
  SessionResourceResolver,
} from '../../src/containment/response-controller.js';

const noFiles: FileQuarantineLike = { quarantine: vi.fn(async () => {}) };
const noKill: ProcessKillLike = { kill: vi.fn(async () => {}) };

describe('ResponseContainmentController', () => {
  it("kill mode kills every pid the session owns", async () => {
    const resolver: SessionResourceResolver = { resolve: () => ({ pids: [101, 102], files: [] }) };
    const killer: ProcessKillLike = { kill: vi.fn(async () => {}) };
    const c = new ResponseContainmentController({ resolver, killer, quarantine: noFiles });
    await c.escalate('s1', 'kill');
    expect(killer.kill).toHaveBeenCalledWith(101);
    expect(killer.kill).toHaveBeenCalledWith(102);
  });

  it("quarantine mode quarantines every file the session touched", async () => {
    const resolver: SessionResourceResolver = { resolve: () => ({ pids: [], files: ['/tmp/x'] }) };
    const quarantine: FileQuarantineLike = { quarantine: vi.fn(async () => {}) };
    const c = new ResponseContainmentController({ resolver, killer: noKill, quarantine });
    await c.escalate('s1', 'quarantine');
    expect(quarantine.quarantine).toHaveBeenCalledWith('/tmp/x');
  });

  it('a failure on one pid does not stop the others', async () => {
    const resolver: SessionResourceResolver = { resolve: () => ({ pids: [1, 2], files: [] }) };
    const kill = vi.fn(async (pid: number) => {
      if (pid === 1) throw new Error('boom');
    });
    const c = new ResponseContainmentController({
      resolver,
      killer: { kill },
      quarantine: noFiles,
    });
    await c.escalate('s1', 'kill');
    expect(kill).toHaveBeenCalledTimes(2); // both attempted despite the first throwing
  });

  it('not-yet-implemented modes resolve (logged, never thrown)', async () => {
    const resolver: SessionResourceResolver = { resolve: () => ({ pids: [], files: [] }) };
    const c = new ResponseContainmentController({ resolver, killer: noKill, quarantine: noFiles });
    await expect(c.escalate('s1', 'branch')).resolves.toBeUndefined();
  });
});
