/**
 * EnrollmentTokenStore tests — issue, lookup, consume, revoke, sweep.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { openDatabase } from '../src/db/connection.js';
import { EnrollmentTokenStore } from '../src/enrollment-store.js';
import { OperatorStore } from '../src/operators-store.js';

describe('EnrollmentTokenStore', () => {
  let db: Database.Database;
  let store: EnrollmentTokenStore;
  let adminId: number;

  beforeEach(() => {
    db = openDatabase({ path: ':memory:' });
    const operators = new OperatorStore({ db });
    const admin = operators.createOperator({
      username: 'admin',
      password: 'integration-test-pw-12345',
      role: 'admin',
    });
    adminId = admin.id;
    store = new EnrollmentTokenStore({ db });
  });

  afterEach(() => {
    db.close();
  });

  it('issues a token and returns plaintext only once', () => {
    const { token, expires_at } = store.issue({ createdByOperatorId: adminId });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(Date.parse(expires_at)).toBeGreaterThan(Date.now());
  });

  it('lookup returns null for unknown plaintext', () => {
    expect(store.lookup('not-a-real-token')).toBeNull();
  });

  it('consume succeeds once + binds the token to an agent_id', () => {
    const { token } = store.issue({ createdByOperatorId: adminId, description: 'fleet-a' });
    const first = store.consume(token, 'agent_abc');
    expect(first.ok).toBe(true);

    const second = store.consume(token, 'agent_xyz');
    expect(second).toEqual({ ok: false, reason: 'used' });

    const meta = store.lookup(token);
    expect(meta?.used_by_agent_id).toBe('agent_abc');
    expect(meta?.description).toBe('fleet-a');
  });

  it('consume fails on expired tokens', () => {
    const { token } = store.issue({ createdByOperatorId: adminId, ttlMs: 1 });
    const start = Date.now();
    while (Date.now() - start < 10) {
      /* spin past expiry */
    }
    expect(store.consume(token, 'agent_a')).toEqual({ ok: false, reason: 'expired' });
  });

  it('consume fails on revoked tokens', () => {
    const { token } = store.issue({ createdByOperatorId: adminId });
    expect(store.revoke(token)).toBe(true);
    expect(store.consume(token, 'agent_a')).toEqual({ ok: false, reason: 'revoked' });
    // Double-revoke is a no-op.
    expect(store.revoke(token)).toBe(false);
  });

  it('consume fails on unknown plaintext', () => {
    expect(store.consume('definitely-not-a-token', 'agent_a')).toEqual({
      ok: false,
      reason: 'unknown',
    });
    expect(store.consume('', 'agent_a')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('listActive excludes used, expired, and revoked tokens', () => {
    const a = store.issue({ createdByOperatorId: adminId, description: 'a' });
    const b = store.issue({ createdByOperatorId: adminId, description: 'b' });
    const c = store.issue({ createdByOperatorId: adminId, description: 'c' });
    const d = store.issue({ createdByOperatorId: adminId, ttlMs: 1, description: 'd' });

    store.consume(a.token, 'agent_a'); // used
    store.revoke(b.token); // revoked
    // c stays active
    void c;
    const start = Date.now();
    while (Date.now() - start < 10) {
      /* spin */
    }
    void d; // expired

    const active = store.listActive();
    expect(active.map((t) => t.description ?? '')).toEqual(['c']);
  });

  it('listAll returns every token (audit trail)', () => {
    const a = store.issue({ createdByOperatorId: adminId });
    const b = store.issue({ createdByOperatorId: adminId });
    store.consume(a.token, 'agent_x');
    store.revoke(b.token);
    expect(store.listAll()).toHaveLength(2);
  });

  it('stores only hash (raw token never persisted)', () => {
    const { token } = store.issue({ createdByOperatorId: adminId });
    const rows = db
      .prepare('SELECT token_hash FROM enrollment_tokens')
      .all() as Array<{ token_hash: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.token_hash).not.toBe(token);
    expect(rows[0]?.token_hash).toHaveLength(64); // sha256 hex
  });

  it('sweep removes old terminal-state tokens', () => {
    const a = store.issue({ createdByOperatorId: adminId, ttlMs: 1 });
    void a;
    const start = Date.now();
    while (Date.now() - start < 10) {
      /* spin past expiry */
    }
    expect(store.sweep(0)).toBe(1);
  });
});
