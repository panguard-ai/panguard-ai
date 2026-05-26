/**
 * End-to-end enrollment-token flow:
 *   - Admin issues a token via POST /api/enrollment-tokens
 *   - Guard registers with X-Enrollment-Token header
 *   - Replay/expiry/revoked tokens are rejected
 *   - GET /api/enrollment-tokens lists tokens (audit)
 *   - Viewer cannot issue or list
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentsStore } from '../src/agents-store.js';
import { OperatorStore } from '../src/operators-store.js';
import { EnrollmentTokenStore } from '../src/enrollment-store.js';
import { FleetAggregator } from '../src/aggregator.js';
import { ManagerServer } from '../src/server.js';

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (typeof addr === 'object' && addr) {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        reject(new Error('no address'));
      }
    });
  });
}

function extractCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const m = setCookie.match(/(?:^|;\s*)pgm_session=([^;]*)/);
  return m && m[1] ? m[1] : null;
}

interface Resp {
  status: number;
  body: unknown;
  setCookie: string | null;
}

async function req(url: string, init: RequestInit = {}): Promise<Resp> {
  const r = await fetch(url, init);
  const text = await r.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* leave */
  }
  return { status: r.status, body, setCookie: r.headers.get('set-cookie') };
}

describe('enrollment-token HTTP flow', () => {
  let tmp: string;
  let port: number;
  let base: string;
  let server: ManagerServer;
  let registry: AgentsStore;
  let operators: OperatorStore;
  let enrollment: EnrollmentTokenStore;
  let adminCookie: string;
  let viewerCookie: string;

  beforeEach(async () => {
    tmp = join(tmpdir(), `pgm-enroll-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmp, { recursive: true });
    port = await getFreePort();
    base = `http://127.0.0.1:${port}`;
    registry = new AgentsStore({ dbPath: join(tmp, 'manager.db') });
    operators = new OperatorStore({ db: registry.getRawDb() });
    enrollment = new EnrollmentTokenStore({ db: registry.getRawDb() });
    const admin = operators.createOperator({
      username: 'admin',
      password: 'test-pw-correct-horse',
      role: 'admin',
    });
    const viewer = operators.createOperator({
      username: 'viewer',
      password: 'test-pw-correct-horse',
      role: 'viewer',
    });
    adminCookie = `pgm_session=${operators.createSession(admin.id).token}`;
    viewerCookie = `pgm_session=${operators.createSession(viewer.id).token}`;
    const aggregator = new FleetAggregator();
    server = new ManagerServer({
      port,
      host: '127.0.0.1',
      registry,
      aggregator,
      operators,
      enrollment,
    });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    registry.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('POST /api/enrollment-tokens', () => {
    it('admin can issue a token', async () => {
      const r = await req(`${base}/api/enrollment-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ description: 'fleet-a' }),
      });
      expect(r.status).toBe(201);
      const body = r.body as { data: { token: string; expires_at: string } };
      expect(body.data.token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(Date.parse(body.data.expires_at)).toBeGreaterThan(Date.now());
    });

    it('viewer cannot issue (403)', async () => {
      const r = await req(`${base}/api/enrollment-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: viewerCookie },
        body: JSON.stringify({}),
      });
      expect(r.status).toBe(403);
    });

    it('unauthenticated cannot issue (401)', async () => {
      const r = await req(`${base}/api/enrollment-tokens`, { method: 'POST' });
      expect(r.status).toBe(401);
    });

    it('rejects insane ttl_ms', async () => {
      const r = await req(`${base}/api/enrollment-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ ttl_ms: -1 }),
      });
      expect(r.status).toBe(400);
    });
  });

  describe('GET /api/enrollment-tokens', () => {
    it('admin can list', async () => {
      enrollment.issue({ createdByOperatorId: 1, description: 'a' });
      enrollment.issue({ createdByOperatorId: 1, description: 'b' });
      const r = await req(`${base}/api/enrollment-tokens`, {
        headers: { Cookie: adminCookie },
      });
      expect(r.status).toBe(200);
      const body = r.body as { data: { tokens: unknown[]; total: number } };
      expect(body.data.total).toBe(2);
      // Plaintext token MUST NOT leak via list endpoint.
      expect(JSON.stringify(body)).not.toMatch(/token_hash/);
    });

    it('viewer cannot list (403)', async () => {
      const r = await req(`${base}/api/enrollment-tokens`, {
        headers: { Cookie: viewerCookie },
      });
      expect(r.status).toBe(403);
    });
  });

  describe('POST /api/agents/register (enrollment-gated)', () => {
    async function issueAndRegister(
      enrollmentToken: string,
      machineId: string
    ): Promise<Resp> {
      return req(`${base}/api/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Enrollment-Token': enrollmentToken },
        body: JSON.stringify({
          hostname: 'h',
          os_type: 'linux',
          panguard_version: 'x',
          machine_id: machineId,
        }),
      });
    }

    it('happy path: issue → register succeeds; token marked used + bound to agent_id', async () => {
      const { token } = enrollment.issue({ createdByOperatorId: 1 });
      const r = await issueAndRegister(token, 'm-happy');
      expect(r.status).toBe(201);
      const body = r.body as { data: { agent_id: string } };
      const meta = enrollment.lookup(token);
      expect(meta?.used_by_agent_id).toBe(body.data.agent_id);
    });

    it('replay (second register with same token) is rejected', async () => {
      const { token } = enrollment.issue({ createdByOperatorId: 1 });
      const first = await issueAndRegister(token, 'm-r1');
      expect(first.status).toBe(201);
      const second = await issueAndRegister(token, 'm-r2');
      expect(second.status).toBe(401);
      expect(String((second.body as { error: string }).error)).toContain('used');
    });

    it('unknown token → 401', async () => {
      const r = await issueAndRegister('definitely-not-a-real-token', 'm-x');
      expect(r.status).toBe(401);
    });

    it('expired token → 401', async () => {
      const { token } = enrollment.issue({ createdByOperatorId: 1, ttlMs: 1 });
      const start = Date.now();
      while (Date.now() - start < 10) {
        /* spin */
      }
      const r = await issueAndRegister(token, 'm-y');
      expect(r.status).toBe(401);
      expect(String((r.body as { error: string }).error)).toContain('expired');
    });

    it('revoked token → 401', async () => {
      const { token } = enrollment.issue({ createdByOperatorId: 1 });
      enrollment.revoke(token);
      const r = await issueAndRegister(token, 'm-z');
      expect(r.status).toBe(401);
      expect(String((r.body as { error: string }).error)).toContain('revoked');
    });

    it('missing X-Enrollment-Token → 401', async () => {
      const r = await req(`${base}/api/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: 'h',
          os_type: 'linux',
          panguard_version: 'x',
          machine_id: 'm',
        }),
      });
      expect(r.status).toBe(401);
    });
  });
});
