/**
 * PanguardTrap PidFile tests
 * PanguardTrap PID 檔案測試
 */

import { describe, it, expect, afterEach } from 'vitest';
import { PidFile } from '../src/pid-file.js';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('PidFile', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should write and read current PID', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'trap-pid-'));
    const pidFile = new PidFile(tempDir);

    pidFile.write();

    expect(pidFile.read()).toBe(process.pid);
  });

  it('should return null when no PID file exists', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'trap-pid-'));
    const pidFile = new PidFile(tempDir);

    expect(pidFile.read()).toBeNull();
  });

  it('should detect a running process', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'trap-pid-'));
    const pidFile = new PidFile(tempDir);

    pidFile.write();

    expect(pidFile.isRunning()).toBe(true);
  });

  it('should detect a non-running process', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'trap-pid-'));
    // Write a PID that almost certainly does not exist
    writeFileSync(join(tempDir, 'panguard-trap.pid'), '99999999', 'utf-8');

    const pidFile = new PidFile(tempDir);

    expect(pidFile.isRunning()).toBe(false);
  });

  it('should remove the PID file', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'trap-pid-'));
    const pidFile = new PidFile(tempDir);

    pidFile.write();
    expect(pidFile.read()).toBe(process.pid);

    pidFile.remove();
    expect(pidFile.read()).toBeNull();
  });

  it('should handle remove when no PID file exists', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'trap-pid-'));
    const pidFile = new PidFile(tempDir);

    // Should not throw
    pidFile.remove();
    expect(pidFile.read()).toBeNull();
  });

  it('should return null for invalid PID content', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'trap-pid-'));
    writeFileSync(join(tempDir, 'panguard-trap.pid'), 'not-a-number', 'utf-8');

    const pidFile = new PidFile(tempDir);

    expect(pidFile.read()).toBeNull();
  });

  it('should report not running when PID file has invalid content', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'trap-pid-'));
    writeFileSync(join(tempDir, 'panguard-trap.pid'), 'garbage', 'utf-8');

    const pidFile = new PidFile(tempDir);

    expect(pidFile.isRunning()).toBe(false);
  });
});
