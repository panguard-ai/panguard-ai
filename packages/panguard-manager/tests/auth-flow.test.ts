/**
 * Operator auth end-to-end: login, /me, logout, role-gated admin endpoints,
 * and WebSocket handshake gating.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
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

interface FetchResult {
  status: number;
  body: unknown;
  setCookie: string | null;
}

async function jsonRequest(
  url: string,
  init: RequestInit & { method?: string } = {}
): Promise<FetchResult> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* leave as text */
  }
  return {
    status: res.status,
    body,
    setCookie: res.headers.get('set-cookie'),
  };
}

/** Pull the pgm_session cookie value out of a Set-Cookie header. */
function extractSessionCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const m = setCookie.match(/(?:^|;\s*)pgm_session=([^;]*)/);
  return m && m[1] ? m[1] : null;
}

describe('auth flow', () => {
  let tmp: string;
  let port: number;
  let base: string;
  let server: ManagerServer;
  let registry: AgentsStore;
  let operators: OperatorStore;
  let enrollment: EnrollmentTokenStore;
  let adminOperatorId: number;

  beforeEach(async () => {
    tmp = join(tmpdir(), `pgm-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
    adminOperatorId = admin.id;
    operators.createOperator({
      username: 'viewer',
      password: 'test-pw-correct-horse',
      role: 'viewer',
    });
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

  describe('GET /login', () => {
    it('returns the login HTML', async () => {
      const res = await fetch(`${base}/login`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Sign in');
      expect(html).toContain('PanGuard Manager');
      expect(html).toContain('id="username"');
    });
  });

  describe('POST /api/auth/login', () => {
    it('rejects missing fields with 400', async () => {
      const r = await jsonRequest(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin' }),
      });
      expect(r.status).toBe(400);
    });

    it('rejects wrong password with 401', async () => {
      const r = await jsonRequest(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'wrong' }),
      });
      expect(r.status).toBe(401);
    });

    it('issues a HttpOnly SameSite=Lax cookie on success', async () => {
      const r = await jsonRequest(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'test-pw-correct-horse' }),
      });
      expect(r.status).toBe(200);
      expect(r.setCookie).toBeTruthy();
      expect(r.setCookie).toMatch(/HttpOnly/);
      expect(r.setCookie).toMatch(/SameSite=Lax/);
      expect(extractSessionCookie(r.setCookie)).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without cookie', async () => {
      const r = await jsonRequest(`${base}/api/auth/me`);
      expect(r.status).toBe(401);
    });

    it('returns the operator with a valid cookie', async () => {
      const login = await jsonRequest(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'test-pw-correct-horse' }),
      });
      const token = extractSessionCookie(login.setCookie);
      const me = await jsonRequest(`${base}/api/auth/me`, {
        headers: { Cookie: `pgm_session=${token}` },
      });
      expect(me.status).toBe(200);
      const body = me.body as { data: { operator: { username: string; role: string } } };
      expect(body.data.operator.username).toBe('admin');
      expect(body.data.operator.role).toBe('admin');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the cookie and revokes the session', async () => {
      const login = await jsonRequest(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'test-pw-correct-horse' }),
      });
      const token = extractSessionCookie(login.setCookie);
      const logout = await jsonRequest(`${base}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: `pgm_session=${token}` },
      });
      expect(logout.status).toBe(200);
      expect(logout.setCookie).toMatch(/Max-Age=0/);

      // Session is gone — /me now 401 even with old cookie
      const me = await jsonRequest(`${base}/api/auth/me`, {
        headers: { Cookie: `pgm_session=${token}` },
      });
      expect(me.status).toBe(401);
    });
  });

  describe('admin endpoints', () => {
    async function loginAs(
      username: 'admin' | 'viewer'
    ): Promise<string> {
      const login = await jsonRequest(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: 'test-pw-correct-horse' }),
      });
      const token = extractSessionCookie(login.setCookie);
      if (!token) throw new Error('login failed in test setup');
      return token;
    }

    it('GET /api/agents requires authentication (401 without cookie)', async () => {
      const r = await jsonRequest(`${base}/api/agents`);
      expect(r.status).toBe(401);
    });

    it('GET /api/agents allows any logged-in operator (admin)', async () => {
      const token = await loginAs('admin');
      const r = await jsonRequest(`${base}/api/agents`, {
        headers: { Cookie: `pgm_session=${token}` },
      });
      expect(r.status).toBe(200);
    });

    it('GET /api/agents allows viewer too', async () => {
      const token = await loginAs('viewer');
      const r = await jsonRequest(`${base}/api/agents`, {
        headers: { Cookie: `pgm_session=${token}` },
      });
      expect(r.status).toBe(200);
    });

    it('POST /api/agents/:id/revoke needs admin (viewer gets 403)', async () => {
      // Issue an enrollment token + register an agent to revoke.
      const enrollToken = enrollment.issue({ createdByOperatorId: adminOperatorId }).token;
      const reg = await jsonRequest(`${base}/api/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Enrollment-Token': enrollToken },
        body: JSON.stringify({
          hostname: 'h',
          os_type: 'linux',
          panguard_version: 'x',
          machine_id: 'm-1',
        }),
      });
      const regBody = reg.body as { data: { agent_id: string } };
      const agentId = regBody.data.agent_id;

      const viewerToken = await loginAs('viewer');
      const r = await jsonRequest(`${base}/api/agents/${agentId}/revoke`, {
        method: 'POST',
        headers: { Cookie: `pgm_session=${viewerToken}` },
      });
      expect(r.status).toBe(403);

      const adminToken = await loginAs('admin');
      const ok = await jsonRequest(`${base}/api/agents/${agentId}/revoke`, {
        method: 'POST',
        headers: { Cookie: `pgm_session=${adminToken}` },
      });
      expect(ok.status).toBe(200);
    });
  });

  describe('WebSocket handshake', () => {
    function attemptUpgrade(cookie: string | null): Promise<{ statusCode?: number; upgraded: boolean }> {
      return new Promise((resolve) => {
        const headers: Record<string, string> = {
          Upgrade: 'websocket',
          Connection: 'Upgrade',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'Sec-WebSocket-Version': '13',
        };
        if (cookie) headers['Cookie'] = cookie;
        const req = httpRequest({
          hostname: '127.0.0.1',
          port,
          path: '/ws',
          method: 'GET',
          headers,
        });
        let upgraded = false;
        let statusCode: number | undefined;
        req.on('upgrade', (res, socket) => {
          upgraded = true;
          statusCode = res.statusCode;
          socket.destroy();
        });
        req.on('response', (res) => {
          statusCode = res.statusCode;
          res.resume();
          res.on('end', () => resolve({ statusCode, upgraded }));
        });
        req.on('error', () => resolve({ statusCode, upgraded }));
        req.on('close', () => resolve({ statusCode, upgraded }));
        req.end();
      });
    }

    it('rejects upgrade without a session cookie', async () => {
      const r = await attemptUpgrade(null);
      expect(r.upgraded).toBe(false);
    });

    it('accepts upgrade with a valid session cookie', async () => {
      const login = await jsonRequest(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'test-pw-correct-horse' }),
      });
      const token = extractSessionCookie(login.setCookie);
      const r = await attemptUpgrade(`pgm_session=${token}`);
      expect(r.upgraded).toBe(true);
    });
  });
});
