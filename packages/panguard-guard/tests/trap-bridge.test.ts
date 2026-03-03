/**
 * Tests for Trap -> Guard Bridge
 * 蜜罐 -> 守護引擎橋接測試
 */

import { describe, it, expect } from 'vitest';
import { trapSessionToSecurityEvent } from '../src/bridges/trap-bridge.js';
import type { TrapSession, CredentialAttempt } from '@panguard-ai/panguard-trap';

function makeSession(overrides: Partial<TrapSession> = {}): TrapSession {
  return {
    sessionId: 'test-session-1',
    serviceType: 'ssh',
    sourceIP: '10.0.0.99',
    sourcePort: 54321,
    startTime: new Date('2025-01-01T00:00:00Z'),
    events: [],
    credentials: [],
    commands: [],
    mitreTechniques: [],
    ...overrides,
  };
}

function makeCred(overrides: Partial<CredentialAttempt> = {}): CredentialAttempt {
  return {
    timestamp: new Date(),
    username: 'admin',
    password: 'password123',
    grantedAccess: false,
    ...overrides,
  };
}

describe('trapSessionToSecurityEvent', () => {
  it('should convert a basic session to SecurityEvent', () => {
    const session = makeSession();
    const event = trapSessionToSecurityEvent(session);

    expect(event.source).toBe('honeypot');
    expect(event.id).toMatch(/^honeypot-/);
    expect(event.metadata['sourceIP']).toBe('10.0.0.99');
    expect(event.metadata['serviceType']).toBe('ssh');
    expect(event.metadata['sessionId']).toBe('test-session-1');
  });

  it('should mark session with commands as critical', () => {
    const session = makeSession({
      commands: ['whoami', 'cat /etc/passwd'],
      credentials: [makeCred()],
    });
    const event = trapSessionToSecurityEvent(session);

    expect(event.severity).toBe('critical');
    expect(event.category).toBe('execution');
  });

  it('should mark 5+ credential attempts as high severity', () => {
    const session = makeSession({
      credentials: Array.from({ length: 6 }, () => makeCred()),
    });
    const event = trapSessionToSecurityEvent(session);

    expect(event.severity).toBe('high');
    expect(event.category).toBe('credential_access');
  });

  it('should mark few credential attempts as medium', () => {
    const session = makeSession({
      credentials: [makeCred(), makeCred()],
    });
    const event = trapSessionToSecurityEvent(session);

    expect(event.severity).toBe('medium');
    expect(event.category).toBe('initial_access');
  });

  it('should mark scan-only session as low', () => {
    const session = makeSession();
    const event = trapSessionToSecurityEvent(session);

    expect(event.severity).toBe('low');
    expect(event.category).toBe('reconnaissance');
  });

  it('should include MITRE techniques in description', () => {
    const session = makeSession({
      mitreTechniques: ['T1110.001', 'T1078'],
    });
    const event = trapSessionToSecurityEvent(session);

    expect(event.description).toContain('T1110.001');
    expect(event.description).toContain('T1078');
  });

  it('should include duration in description', () => {
    const session = makeSession({ durationMs: 5000 });
    const event = trapSessionToSecurityEvent(session);

    expect(event.description).toContain('5000ms');
  });

  it('should generate unique IDs', () => {
    const session = makeSession();
    const e1 = trapSessionToSecurityEvent(session);
    const e2 = trapSessionToSecurityEvent(session);

    expect(e1.id).not.toBe(e2.id);
  });

  it('should include credential and command counts in metadata', () => {
    const session = makeSession({
      credentials: [makeCred(), makeCred(), makeCred()],
      commands: ['ls', 'pwd'],
    });
    const event = trapSessionToSecurityEvent(session);

    expect(event.metadata['credentialAttempts']).toBe(3);
    expect(event.metadata['commandCount']).toBe(2);
  });

  it('should preserve raw session in event.raw', () => {
    const session = makeSession();
    const event = trapSessionToSecurityEvent(session);

    expect(event.raw).toBe(session);
  });
});
