import { describe, it, expect, vi, afterEach } from 'vitest';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  normalizeLogEvent,
  normalizeNetworkEvent,
  normalizeFileEvent,
  ProcessMonitor,
  FileMonitor,
  checkThreatIntel,
  isPrivateIP,
  MonitorEngine,
} from '@panguard-ai/core/monitor/index.js';

// Suppress stderr output from logger during tests
const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

afterEach(() => {
  stderrSpy.mockClear();
});

describe('Event Normalizer', () => {
  it('should normalize a log event', () => {
    const event = normalizeLogEvent({
      message: 'SSH login failed for user root',
      source: '/var/log/auth.log',
    });

    expect(event).toBeDefined();
    expect(event.id).toBeTruthy();
    expect(event.description).toBe('SSH login failed for user root');
    expect(event.severity).toBe('high'); // "failed" maps to high
    expect(event.category).toBe('Initial Access'); // "login" maps to Initial Access
    expect(event.host).toBeTruthy();
    expect(event.metadata['logSource']).toBe('/var/log/auth.log');
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('should normalize a network event', () => {
    const event = normalizeNetworkEvent({
      localAddr: '192.168.1.100',
      localPort: 54321,
      remoteAddr: '10.0.0.1',
      remotePort: 443,
      state: 'ESTABLISHED',
      process: 'curl',
    });

    expect(event).toBeDefined();
    expect(event.id).toBeTruthy();
    expect(event.source).toBe('network');
    expect(event.severity).toBe('info');
    expect(event.category).toBe('Network Activity');
    expect(event.description).toContain('192.168.1.100:54321');
    expect(event.description).toContain('10.0.0.1:443');
    expect(event.description).toContain('ESTABLISHED');
    expect(event.description).toContain('curl');
    expect(event.metadata['remoteAddr']).toBe('10.0.0.1');
    expect(event.metadata['remotePort']).toBe(443);
    expect(event.metadata['process']).toBe('curl');
  });

  it('should normalize a file event', () => {
    const event = normalizeFileEvent({
      path: '/etc/passwd',
      action: 'modified',
      oldHash: 'aaaa',
      newHash: 'bbbb',
    });

    expect(event).toBeDefined();
    expect(event.id).toBeTruthy();
    expect(event.source).toBe('file');
    expect(event.severity).toBe('medium'); // modified with different hashes -> medium
    expect(event.category).toBe('Defense Evasion');
    expect(event.description).toContain('modified');
    expect(event.description).toContain('/etc/passwd');
    expect(event.metadata['filePath']).toBe('/etc/passwd');
    expect(event.metadata['action']).toBe('modified');
    expect(event.metadata['oldHash']).toBe('aaaa');
    expect(event.metadata['newHash']).toBe('bbbb');
  });
});

describe('ProcessMonitor', () => {
  it('should get process list', async () => {
    const monitor = new ProcessMonitor(60000);
    const processList = await monitor.getProcessList();

    expect(Array.isArray(processList)).toBe(true);
    expect(processList.length).toBeGreaterThan(0);

    const firstProcess = processList[0]!;
    expect(firstProcess).toHaveProperty('pid');
    expect(firstProcess).toHaveProperty('name');
    expect(typeof firstProcess.pid).toBe('number');
    expect(typeof firstProcess.name).toBe('string');
  });
});

describe('FileMonitor', () => {
  it('should compute hash of a file', async () => {
    const tempFile = join(tmpdir(), `panguard-test-${Date.now()}.txt`);

    try {
      await writeFile(tempFile, 'test content for hashing');

      const monitor = new FileMonitor([tempFile]);
      const hash = await monitor.computeHash(tempFile);

      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex chars
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await unlink(tempFile).catch(() => {});
    }
  });
});

describe('Threat Intelligence', () => {
  it('should detect known malicious IP', () => {
    // 185.220.101.0/24 is a known scanner range in the built-in database
    const threat = checkThreatIntel('185.220.101.42');

    expect(threat).not.toBeNull();
    expect(threat!.type).toBe('scanner');
    expect(threat!.source).toBe('tor-exit-nodes');
    expect(threat!.ip).toBe('185.220.101.0/24');
  });

  it('should correctly identify private IPs with isPrivateIP', () => {
    // Private IPs
    expect(isPrivateIP('192.168.1.1')).toBe(true);
    expect(isPrivateIP('10.0.0.1')).toBe(true);
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('127.0.0.1')).toBe(true);
    expect(isPrivateIP('169.254.1.1')).toBe(true);

    // Public IPs
    expect(isPrivateIP('8.8.8.8')).toBe(false);
    expect(isPrivateIP('1.1.1.1')).toBe(false);
  });
});

describe('MonitorEngine', () => {
  it('should create and start/stop without crashing', async () => {
    const engine = new MonitorEngine({
      logMonitor: false,
      networkMonitor: false,
      processMonitor: false,
      fileMonitor: false,
    });

    expect(engine.getStatus()).toBe('stopped');

    engine.start();
    expect(engine.getStatus()).toBe('running');

    // Run for 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));

    engine.stop();
    expect(engine.getStatus()).toBe('stopped');
  });
});
