/**
 * Regression tests for finding F_mcp-pidfile (1.8.2 audit).
 * 針對 F_mcp-pidfile 稽核發現的回歸測試。
 *
 * The guard daemon writes its PID to `<dataDir>/panguard-guard.pid`
 * (packages/panguard-guard/src/daemon/index.ts). Before this fix,
 * executeGuardStop and executeStatus read `<dataDir>/guard.pid` — a file
 * nothing ever writes — so stop was a no-op and status always reported
 * "not running" even while the guard was live.
 *
 * These tests assert the bug CANNOT recur: stop and status must read the same
 * `panguard-guard.pid` file the daemon writes, and must ignore the stale
 * `guard.pid` filename entirely.
 *
 * @module @panguard-ai/panguard-mcp/tests/1.8.2-F_mcp-pidfile
 */

import { describe, it, expect, afterAll, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { executeGuardStop, executeStatus } from '../src/tools/guard-tools.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** The one canonical filename the guard daemon writes. */
const CANONICAL_PID_FILE = 'panguard-guard.pid';
/** The wrong filename the buggy code used to read. Nothing writes this. */
const WRONG_PID_FILE = 'guard.pid';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseResult(result: { content: Array<{ text: string }> }): Record<string, unknown> {
  return JSON.parse(result.content[0]!.text) as Record<string, unknown>;
}

const dirsToClean: string[] = [];

function tmpDir(label: string): string {
  const dir = path.join(
    os.tmpdir(),
    `pg-mcp-pidfile-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  dirsToClean.push(dir);
  return dir;
}

afterAll(async () => {
  for (const dir of dirsToClean) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

/**
 * A PID that is in the valid range PidFile accepts (2..4194304) but is not a
 * live process, so process.kill(pid, 0) throws. 4194303 is one below the cap
 * and astronomically unlikely to be a real live PID.
 */
const DEAD_BUT_VALID_PID = 4194303;

// ═══════════════════════════════════════════════════════════════════════════
// panguard_status reads the canonical PID file
// ═══════════════════════════════════════════════════════════════════════════

describe('panguard_status — reads panguard-guard.pid, not guard.pid', () => {
  it('reports running=true when the LIVE current process PID is in panguard-guard.pid', async () => {
    const dataDir = tmpDir('status-live');
    await fs.mkdir(dataDir, { recursive: true });
    // This test process is guaranteed alive; write OUR pid to the canonical file.
    await fs.writeFile(path.join(dataDir, CANONICAL_PID_FILE), String(process.pid));

    const parsed = parseResult(await executeStatus({ dataDir }));
    const guard = parsed['guard'] as Record<string, unknown>;

    expect(guard['running']).toBe(true);
    expect(guard['pid']).toBe(process.pid);
  });

  it('IGNORES a live PID written to the WRONG guard.pid filename (must NOT report running)', async () => {
    const dataDir = tmpDir('status-wrongname');
    await fs.mkdir(dataDir, { recursive: true });
    // Put a genuinely-live PID in the stale filename. The buggy code would
    // report running=true off this; the fixed code must ignore it.
    await fs.writeFile(path.join(dataDir, WRONG_PID_FILE), String(process.pid));

    const parsed = parseResult(await executeStatus({ dataDir }));
    const guard = parsed['guard'] as Record<string, unknown>;

    expect(guard['running']).toBe(false);
    expect(guard['pid']).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// panguard_guard_stop signals the recorded PID and reads the canonical file
// ═══════════════════════════════════════════════════════════════════════════

describe('panguard_guard_stop — acts on panguard-guard.pid, not guard.pid', () => {
  it('signals the recorded live PID and reports stopped', async () => {
    const dataDir = tmpDir('stop-live');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, CANONICAL_PID_FILE), String(process.pid));

    const killSpy = vi.spyOn(process, 'kill').mockImplementation((): true => true);
    try {
      const parsed = parseResult(await executeGuardStop({ dataDir }));

      expect(parsed['status']).toBe('stopped');
      expect(parsed['pid']).toBe(process.pid);
      // Must have signalled SIGTERM to the PID recorded in the canonical file.
      expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGTERM');
    } finally {
      killSpy.mockRestore();
    }
  });

  it('does NOT act on a live PID written to the WRONG guard.pid filename', async () => {
    const dataDir = tmpDir('stop-wrongname');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, WRONG_PID_FILE), String(process.pid));

    const killSpy = vi.spyOn(process, 'kill').mockImplementation((): true => true);
    try {
      const parsed = parseResult(await executeGuardStop({ dataDir }));

      // No canonical PID file exists → nothing to stop.
      expect(parsed['status']).toBe('not_running');
      // Crucially, we must NEVER have signalled the process from guard.pid.
      expect(killSpy).not.toHaveBeenCalledWith(process.pid, 'SIGTERM');
    } finally {
      killSpy.mockRestore();
    }
    // The wrong-named file must be left untouched (it is not ours to manage).
    const wrongStillThere = await fs
      .access(path.join(dataDir, WRONG_PID_FILE))
      .then(() => true)
      .catch(() => false);
    expect(wrongStillThere).toBe(true);
  });

  it('cleans up a stale (valid-but-dead PID) canonical PID file', async () => {
    const dataDir = tmpDir('stop-stale-canonical');
    await fs.mkdir(dataDir, { recursive: true });
    const pidPath = path.join(dataDir, CANONICAL_PID_FILE);
    await fs.writeFile(pidPath, String(DEAD_BUT_VALID_PID));

    const parsed = parseResult(await executeGuardStop({ dataDir }));

    expect(parsed['status']).toBe('not_running');
    // Stale canonical PID file should be removed.
    const stillThere = await fs
      .access(pidPath)
      .then(() => true)
      .catch(() => false);
    expect(stillThere).toBe(false);
  });

  it('reports not_running when no PID file exists at all', async () => {
    const dataDir = tmpDir('stop-none');
    await fs.mkdir(dataDir, { recursive: true });

    const parsed = parseResult(await executeGuardStop({ dataDir }));

    expect(parsed['status']).toBe('not_running');
    expect(parsed['pid']).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// start / stop / status agree on ONE filename (source-of-truth invariant)
// ═══════════════════════════════════════════════════════════════════════════

describe('source-of-truth invariant', () => {
  it('a PID file written by the daemon filename is seen by BOTH status and stop', async () => {
    const dataDir = tmpDir('agree');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, CANONICAL_PID_FILE), String(process.pid));

    // status sees it as running
    const statusParsed = parseResult(await executeStatus({ dataDir }));
    expect((statusParsed['guard'] as Record<string, unknown>)['running']).toBe(true);

    // stop sees the same file and signals it
    const killSpy = vi.spyOn(process, 'kill').mockImplementation((): true => true);
    try {
      const stopParsed = parseResult(await executeGuardStop({ dataDir }));
      expect(stopParsed['status']).toBe('stopped');
      expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGTERM');
    } finally {
      killSpy.mockRestore();
    }
  });
});
