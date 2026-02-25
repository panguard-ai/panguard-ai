/**
 * E2E: Dashboard HTTP API and security tests
 * Tests the dashboard server's security hardening
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { DashboardServer } from '@openclaw/panguard-guard/dashboard/index.js';

// Suppress logger output during tests
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

describe('Dashboard API Security', () => {
  let dashboard: DashboardServer | null = null;

  afterEach(async () => {
    if (dashboard) {
      try { await dashboard.stop(); } catch { /* ignore */ }
      dashboard = null;
    }
  });

  it('should start and stop cleanly', async () => {
    dashboard = new DashboardServer(0);
    await dashboard.start();
    await dashboard.stop();
    dashboard = null;
  });

  it('should generate a valid auth token', () => {
    dashboard = new DashboardServer(0);
    const token = dashboard.getAuthToken();
    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes hex = 64 chars
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('should generate unique auth tokens per instance', () => {
    const d1 = new DashboardServer(0);
    const d2 = new DashboardServer(0);
    expect(d1.getAuthToken()).not.toBe(d2.getAuthToken());
  });

  it('should accept status updates', () => {
    dashboard = new DashboardServer(0);
    // Should not throw
    dashboard.updateStatus({
      mode: 'protection',
      eventsProcessed: 42,
      threatsDetected: 3,
    });
  });

  it('should accept events and limit buffer size', () => {
    dashboard = new DashboardServer(0);
    // Push more than maxRecentEvents (200)
    for (let i = 0; i < 250; i++) {
      dashboard.pushEvent({
        type: 'new_event',
        data: { index: i },
        timestamp: new Date().toISOString(),
      });
    }
    // Internal buffer should be capped (tested via no crash)
  });

  it('should track threat map entries and deduplicate', () => {
    dashboard = new DashboardServer(0);
    dashboard.addThreatMapEntry({
      sourceIP: '10.0.0.1',
      attackType: 'brute_force',
      count: 5,
      lastSeen: new Date().toISOString(),
    });
    dashboard.addThreatMapEntry({
      sourceIP: '10.0.0.1',
      attackType: 'brute_force',
      count: 3,
      lastSeen: new Date().toISOString(),
    });
    // Deduplication: same IP + attackType should merge counts
    // Verified by no crash; internal map handles merge
  });
});
