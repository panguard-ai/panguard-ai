/**
 * TrapEngine tests
 * TrapEngine 測試
 */

import { describe, it, expect } from 'vitest';
import { TrapEngine } from '../src/trap-engine.js';
import type { TrapConfig } from '../src/types.js';
import { DEFAULT_TRAP_CONFIG } from '../src/types.js';

/** Create engine config with no enabled services (for unit testing without TCP) */
function createTestConfig(overrides: Partial<TrapConfig> = {}): TrapConfig {
  return {
    ...DEFAULT_TRAP_CONFIG,
    services: [], // No services to avoid TCP binding in tests
    ...overrides,
  };
}

describe('TrapEngine', () => {
  it('should initialize in idle state', () => {
    const engine = new TrapEngine(createTestConfig());
    expect(engine.status).toBe('idle');
  });

  it('should start with no services', async () => {
    const engine = new TrapEngine(createTestConfig());
    await engine.start();
    expect(engine.status).toBe('running');
    expect(engine.getRunningServices()).toHaveLength(0);
    await engine.stop();
  });

  it('should stop gracefully', async () => {
    const engine = new TrapEngine(createTestConfig());
    await engine.start();
    await engine.stop();
    expect(engine.status).toBe('idle');
  });

  it('should not start twice', async () => {
    const engine = new TrapEngine(createTestConfig());
    await engine.start();
    await engine.start(); // should be no-op
    expect(engine.status).toBe('running');
    await engine.stop();
  });

  it('should not stop when not running', async () => {
    const engine = new TrapEngine(createTestConfig());
    await engine.stop(); // should be no-op
    expect(engine.status).toBe('idle');
  });

  it('should return empty statistics initially', async () => {
    const engine = new TrapEngine(createTestConfig());
    await engine.start();

    const stats = engine.getStatistics();
    expect(stats.totalSessions).toBe(0);
    expect(stats.activeSessions).toBe(0);
    expect(stats.uniqueSourceIPs).toBe(0);
    expect(stats.totalCredentialAttempts).toBe(0);
    expect(stats.totalCommandsCaptured).toBe(0);
    expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);

    await engine.stop();
  });

  it('should provide access to profiler', () => {
    const engine = new TrapEngine(createTestConfig());
    const profiler = engine.getProfiler();
    expect(profiler).toBeDefined();
    expect(profiler.getProfileCount()).toBe(0);
  });

  it('should return empty intel reports', () => {
    const engine = new TrapEngine(createTestConfig());
    expect(engine.getIntelReports()).toHaveLength(0);
  });

  it('should return empty completed sessions', () => {
    const engine = new TrapEngine(createTestConfig());
    expect(engine.getCompletedSessions()).toHaveLength(0);
  });

  it('should provide intel summary', () => {
    const engine = new TrapEngine(createTestConfig());
    const summary = engine.getIntelSummary();
    expect(summary.totalIntelReports).toBe(0);
    expect(summary.uniqueSourceIPs).toBe(0);
  });

  it('should register session handler', async () => {
    const engine = new TrapEngine(createTestConfig());
    const sessions: unknown[] = [];
    engine.onSession((s) => sessions.push(s));
    expect(sessions).toHaveLength(0);
    await engine.start();
    await engine.stop();
  });

  it('should have proper session service distribution', async () => {
    const engine = new TrapEngine(createTestConfig());
    await engine.start();

    const stats = engine.getStatistics();
    expect(stats.sessionsByService.ssh).toBe(0);
    expect(stats.sessionsByService.http).toBe(0);
    expect(stats.sessionsByService.ftp).toBe(0);

    await engine.stop();
  });

  it('should have proper skill distribution', async () => {
    const engine = new TrapEngine(createTestConfig());
    await engine.start();

    const stats = engine.getStatistics();
    expect(stats.skillDistribution.script_kiddie).toBe(0);
    expect(stats.skillDistribution.intermediate).toBe(0);
    expect(stats.skillDistribution.advanced).toBe(0);
    expect(stats.skillDistribution.apt).toBe(0);

    await engine.stop();
  });
});
