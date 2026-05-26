/**
 * OperatorStore tests — password hashing + session lifecycle.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase } from '../src/db/connection.js';
import { OperatorStore } from '../src/operators-store.js';
import type Database from 'better-sqlite3';

describe('OperatorStore', () => {
  let db: Database.Database;
  let store: OperatorStore;

  beforeEach(() => {
    db = openDatabase({ path: ':memory:' });
    store = new OperatorStore({ db });
  });

  afterEach(() => {
    db.close();
  });

  describe('createOperator', () => {
    it('creates an admin and returns the public shape', () => {
      const op = store.createOperator({
        username: 'admin',
        password: 'correct-horse-battery-staple',
        role: 'admin',
      });
      expect(op.username).toBe('admin');
      expect(op.role).toBe('admin');
      expect(op.disabled).toBe(false);
      expect(op.id).toBeGreaterThan(0);
    });

    it('rejects short passwords', () => {
      expect(() =>
        store.createOperator({ username: 'admin', password: 'short', role: 'admin' })
      ).toThrow(/password must be at least 12/);
    });

    it('rejects empty username', () => {
      expect(() =>
        store.createOperator({ username: '   ', password: 'correct-horse-battery-staple', role: 'admin' })
      ).toThrow(/username required/);
    });

    it('rejects duplicate username', () => {
      store.createOperator({ username: 'admin', password: 'correct-horse-battery-staple', role: 'admin' });
      expect(() =>
        store.createOperator({ username: 'admin', password: 'correct-horse-battery-staple', role: 'viewer' })
      ).toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('returns operator on correct password', () => {
      store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      const op = store.verifyPassword('alice', 'correct-horse-battery-staple');
      expect(op).not.toBeNull();
      expect(op?.username).toBe('alice');
    });

    it('returns null on wrong password', () => {
      store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      expect(store.verifyPassword('alice', 'wrong-password-here')).toBeNull();
    });

    it('returns null for unknown username (but still runs KDF)', () => {
      const t0 = Date.now();
      expect(store.verifyPassword('nobody', 'anything-at-all-here')).toBeNull();
      const elapsed = Date.now() - t0;
      // scrypt with N=32768 takes >=50ms on any modern CPU; if we returned
      // null without running it we'd see <5ms (catches timing-attack regression).
      expect(elapsed).toBeGreaterThan(30);
    });

    it('returns null for disabled operator', () => {
      const op = store.createOperator({ username: 'bob', password: 'correct-horse-battery-staple', role: 'admin' });
      // Need a second admin or setDisabled refuses.
      store.createOperator({ username: 'carol', password: 'correct-horse-battery-staple', role: 'admin' });
      store.setDisabled(op.id, true);
      expect(store.verifyPassword('bob', 'correct-horse-battery-staple')).toBeNull();
    });
  });

  describe('sessions', () => {
    it('issues a token + validates it', () => {
      const op = store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      const { token, expires_at } = store.createSession(op.id);
      expect(token).toHaveLength(64);
      expect(Date.parse(expires_at)).toBeGreaterThan(Date.now());

      const lookup = store.validateSession(token);
      expect(lookup?.operator.username).toBe('alice');
    });

    it('rejects unknown token', () => {
      expect(store.validateSession('a'.repeat(64))).toBeNull();
      expect(store.validateSession('')).toBeNull();
    });

    it('rejects expired sessions', () => {
      const op = store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      const { token } = store.createSession(op.id, { ttlMs: 1 });
      // Sleep a few ms to cross the expiry boundary.
      const start = Date.now();
      while (Date.now() - start < 10) {
        /* spin */
      }
      expect(store.validateSession(token)).toBeNull();
    });

    it('rejects revoked sessions', () => {
      const op = store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      const { token } = store.createSession(op.id);
      expect(store.revokeSession(token)).toBe(true);
      expect(store.validateSession(token)).toBeNull();
      // Second revoke is a no-op.
      expect(store.revokeSession(token)).toBe(false);
    });

    it('revokeAllSessionsForOperator invalidates every session', () => {
      const op = store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      const a = store.createSession(op.id);
      const b = store.createSession(op.id);
      expect(store.revokeAllSessionsForOperator(op.id)).toBe(2);
      expect(store.validateSession(a.token)).toBeNull();
      expect(store.validateSession(b.token)).toBeNull();
    });

    it('rejects sessions whose operator is disabled', () => {
      const op = store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      // Second admin so we can disable the first.
      store.createOperator({ username: 'carol', password: 'correct-horse-battery-staple', role: 'admin' });
      const { token } = store.createSession(op.id);
      store.setDisabled(op.id, true); // also revokes all sessions for alice
      expect(store.validateSession(token)).toBeNull();
    });

    it('sweepExpiredSessions removes expired + revoked rows', () => {
      const op = store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      store.createSession(op.id, { ttlMs: 1 });
      const start = Date.now();
      while (Date.now() - start < 10) {
        /* spin past expiry */
      }
      const active = store.createSession(op.id);
      expect(store.sweepExpiredSessions()).toBe(1);
      expect(store.validateSession(active.token)).not.toBeNull();
    });

    it('stores token only as hash (raw token is not in DB)', () => {
      const op = store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      const { token } = store.createSession(op.id);
      const rows = db.prepare('SELECT token_hash FROM operator_sessions').all() as Array<{
        token_hash: string;
      }>;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.token_hash).not.toBe(token);
      expect(rows[0]?.token_hash).toHaveLength(64); // sha256 hex
    });
  });

  describe('lifecycle', () => {
    it('setDisabled refuses to disable the last active admin', () => {
      const op = store.createOperator({ username: 'admin', password: 'correct-horse-battery-staple', role: 'admin' });
      expect(() => store.setDisabled(op.id, true)).toThrow(/last active admin/);
    });

    it('setDisabled allows disabling when another admin exists', () => {
      const a = store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      store.createOperator({ username: 'bob', password: 'correct-horse-battery-staple', role: 'admin' });
      store.setDisabled(a.id, true);
      expect(store.findById(a.id)?.disabled).toBe(true);
    });

    it('setPassword changes the credential', () => {
      const op = store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      store.setPassword(op.id, 'new-password-totally-different');
      expect(store.verifyPassword('alice', 'correct-horse-battery-staple')).toBeNull();
      expect(store.verifyPassword('alice', 'new-password-totally-different')).not.toBeNull();
    });

    it('listOperators returns every record', () => {
      store.createOperator({ username: 'alice', password: 'correct-horse-battery-staple', role: 'admin' });
      store.createOperator({ username: 'bob', password: 'correct-horse-battery-staple', role: 'viewer' });
      expect(store.listOperators()).toHaveLength(2);
    });
  });
});
