/**
 * HTTP integration tests for TC endpoints.
 * Spins up a real ThreatCloudServer on a random port, sends real HTTP requests.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ThreatCloudServer } from '../src/server.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ── Test helpers ──────────────────────────────────────

let server: ThreatCloudServer;
let baseUrl: string;
let tempDir: string;
const ADMIN_KEY = 'test-admin-key-12345';
const API_KEY = 'test-api-key-67890';

function adminHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` };
}

function apiHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` };
}

async function post(path: string, body: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: headers ?? adminHeaders(),
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

async function get(path: string, headers?: Record<string, string>) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

async function del(path: string, headers?: Record<string, string>) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: headers ?? adminHeaders(),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

// ── Setup / Teardown ──────────────────────────────────

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'tc-endpoint-test-'));
  server = new ThreatCloudServer({
    port: 0, // random port
    host: '127.0.0.1',
    dbPath: join(tempDir, 'test.db'),
    apiKeyRequired: true,
    apiKeys: [API_KEY],
    rateLimitPerMinute: 1000,
    adminApiKey: ADMIN_KEY,
  });
  await server.start();
  // Extract the actual port from the server
  const addr = (
    server as unknown as { server: { address: () => { port: number } } }
  ).server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await server.stop();
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

// ── Health ────────────────────────────────────────────

describe('/health', () => {
  it('returns healthy without auth', async () => {
    const { status, json } = await get('/health');
    expect(status).toBe(200);
    expect(json['ok']).toBe(true);
  });
});

// ── Public read endpoints ─────────────────────────────

describe('public read endpoints', () => {
  it('GET /api/stats without key succeeds', async () => {
    const { status, json } = await get('/api/stats');
    expect(status).toBe(200);
    expect(json['ok']).toBe(true);
  });

  it('GET /api/metrics without key succeeds', async () => {
    const { status, json } = await get('/api/metrics');
    expect(status).toBe(200);
    expect(json['ok']).toBe(true);
  });

  it('GET /api/rules without key succeeds (public read)', async () => {
    const { status, json } = await get('/api/rules?since=2020-01-01');
    expect(status).toBe(200);
    expect(json['ok']).toBe(true);
  });
});

// ── Auth gate ─────────────────────────────────────────

describe('auth gate', () => {
  it('rejects POST /api/rules without key', async () => {
    const { status, json } = await post(
      '/api/rules',
      { ruleId: 'x', ruleContent: 'x', source: 'x' },
      { 'Content-Type': 'application/json' }
    );
    expect(status).toBe(401);
    expect(json['ok']).toBe(false);
  });

  it('accepts admin key for general auth', async () => {
    const { status } = await get('/api/threats', adminHeaders());
    // 200 = passed both general + admin auth
    expect(status).toBe(200);
  });

  it('accepts api key for general auth', async () => {
    const { status } = await get('/api/rules?since=2020-01-01', apiHeaders());
    expect(status).toBe(200);
  });
});

// ── POST /api/rules/sync ─────────────────────────────

describe('POST /api/rules/sync', () => {
  it('rejects without admin key', async () => {
    const { status, json } = await post('/api/rules/sync', { rules: [] }, apiHeaders());
    expect(status).toBe(403);
    expect(json['ok']).toBe(false);
  });

  it('syncs ATR rules with admin key', async () => {
    const rules = [
      { ruleId: 'ATR-TEST-001', ruleContent: 'title: Test\nid: ATR-TEST-001', source: 'atr' },
      { ruleId: 'ATR-TEST-002', ruleContent: 'title: Test2\nid: ATR-TEST-002', source: 'atr' },
    ];
    const { status, json } = await post('/api/rules/sync', { rules }, adminHeaders());
    expect(status).toBe(200);
    expect(json['ok']).toBe(true);
    const data = json['data'] as Record<string, unknown>;
    expect(data['count']).toBe(2);
    expect(data['skipped']).toBe(0);
  });

  it('skips non-atr source rules', async () => {
    const rules = [{ ruleId: 'COMM-001', ruleContent: 'title: Comm', source: 'community' }];
    const { status, json } = await post('/api/rules/sync', { rules }, adminHeaders());
    expect(status).toBe(200);
    const data = json['data'] as Record<string, unknown>;
    expect(data['count']).toBe(0);
    expect(data['skipped']).toBe(1);
  });

  it('rejects more than 200 rules', async () => {
    const rules = Array.from({ length: 201 }, (_, i) => ({
      ruleId: `R-${i}`,
      ruleContent: `title: R${i}`,
      source: 'atr',
    }));
    const { status, json } = await post('/api/rules/sync', { rules }, adminHeaders());
    expect(status).toBe(400);
    expect(json['ok']).toBe(false);
  });
});

// ── POST /api/rules/bulk-delete ──────────────────────

describe('POST /api/rules/bulk-delete', () => {
  it('rejects without admin key', async () => {
    const { status } = await post('/api/rules/bulk-delete', { ruleIds: ['x'] }, apiHeaders());
    expect(status).toBe(403);
  });

  it('deletes rules by IDs', async () => {
    // First insert rules
    await post(
      '/api/rules/sync',
      {
        rules: [
          { ruleId: 'DEL-001', ruleContent: 'title: Del1', source: 'atr' },
          { ruleId: 'DEL-002', ruleContent: 'title: Del2', source: 'atr' },
        ],
      },
      adminHeaders()
    );

    const { status, json } = await post(
      '/api/rules/bulk-delete',
      { ruleIds: ['DEL-001', 'DEL-002'] },
      adminHeaders()
    );
    expect(status).toBe(200);
    expect(json['ok']).toBe(true);
    const data = json['data'] as Record<string, unknown>;
    expect(data['count']).toBe(2);
  });

  it('rejects empty ruleIds', async () => {
    const { status, json } = await post('/api/rules/bulk-delete', { ruleIds: [] }, adminHeaders());
    expect(status).toBe(400);
    expect(json['ok']).toBe(false);
  });
});

// ── POST /api/devices/heartbeat ──────────────────────

describe('POST /api/devices/heartbeat', () => {
  it('rejects without API key', async () => {
    const { status } = await post(
      '/api/devices/heartbeat',
      { deviceId: 'd1', orgId: 'o1' },
      { 'Content-Type': 'application/json' }
    );
    expect(status).toBe(401);
  });

  it('accepts heartbeat with API key', async () => {
    const { status, json } = await post(
      '/api/devices/heartbeat',
      {
        deviceId: 'dev-test-001',
        orgId: 'org-test-001',
        hostname: 'test-machine',
        osType: 'darwin',
        agentCount: 5,
        guardVersion: '2.0.1',
      },
      apiHeaders()
    );
    expect(status).toBe(200);
    expect(json['ok']).toBe(true);
  });

  it('rejects missing deviceId', async () => {
    const { status, json } = await post('/api/devices/heartbeat', { orgId: 'o1' }, apiHeaders());
    expect(status).toBe(400);
    expect(json['ok']).toBe(false);
  });

  it('rejects missing orgId', async () => {
    const { status, json } = await post('/api/devices/heartbeat', { deviceId: 'd1' }, apiHeaders());
    expect(status).toBe(400);
    expect(json['ok']).toBe(false);
  });

  it('auto-creates org on first heartbeat', async () => {
    await post(
      '/api/devices/heartbeat',
      { deviceId: 'dev-auto-org', orgId: 'auto-org-001', hostname: 'h' },
      apiHeaders()
    );
    // Verify device appears in fleet
    const { status, json } = await get('/api/orgs/auto-org-001/devices', adminHeaders());
    expect(status).toBe(200);
    const data = json['data'] as Record<string, unknown>;
    const devices = data['devices'] as Array<Record<string, unknown>>;
    expect(devices.length).toBe(1);
    expect(devices[0]['hostname']).toBe('h');
  });
});

// ── GET /api/orgs/:orgId/devices ─────────────────────

describe('GET /api/orgs/:orgId/devices', () => {
  it('rejects without admin key', async () => {
    const { status } = await get('/api/orgs/org1/devices', apiHeaders());
    expect(status).toBe(403);
  });

  it('returns devices for org', async () => {
    // Send heartbeats for 2 devices in same org
    await post(
      '/api/devices/heartbeat',
      {
        deviceId: 'fleet-d1',
        orgId: 'fleet-org',
        hostname: 'machine-1',
      },
      apiHeaders()
    );
    await post(
      '/api/devices/heartbeat',
      {
        deviceId: 'fleet-d2',
        orgId: 'fleet-org',
        hostname: 'machine-2',
      },
      apiHeaders()
    );

    const { status, json } = await get('/api/orgs/fleet-org/devices', adminHeaders());
    expect(status).toBe(200);
    const data = json['data'] as Record<string, unknown>;
    expect(data['total']).toBe(2);
    const devices = data['devices'] as Array<Record<string, unknown>>;
    expect(devices.length).toBe(2);
  });

  it('returns empty for unknown org', async () => {
    const { status, json } = await get('/api/orgs/nonexistent/devices', adminHeaders());
    expect(status).toBe(200);
    const data = json['data'] as Record<string, unknown>;
    expect(data['total']).toBe(0);
  });
});

// ── /api/orgs/:orgId/policies ────────────────────────

describe('/api/orgs/:orgId/policies', () => {
  const orgId = 'policy-org';

  it('rejects GET without admin key', async () => {
    const { status } = await get(`/api/orgs/${orgId}/policies`, apiHeaders());
    expect(status).toBe(403);
  });

  it('creates and retrieves policy', async () => {
    // Ensure org exists
    await post(
      '/api/devices/heartbeat',
      {
        deviceId: 'pol-d1',
        orgId,
        hostname: 'h',
      },
      apiHeaders()
    );

    // Create policy
    const { status: createStatus, json: createJson } = await post(
      `/api/orgs/${orgId}/policies`,
      { category: 'crypto', action: 'block' },
      adminHeaders()
    );
    expect(createStatus).toBe(200);
    expect(createJson['ok']).toBe(true);

    // Read policies
    const { status: getStatus, json: getJson } = await get(
      `/api/orgs/${orgId}/policies`,
      adminHeaders()
    );
    expect(getStatus).toBe(200);
    const data = getJson['data'] as Array<Record<string, unknown>>;
    expect(data.length).toBeGreaterThanOrEqual(1);
    const cryptoPolicy = data.find((p) => p['category'] === 'crypto');
    expect(cryptoPolicy).toBeDefined();
    expect(cryptoPolicy!['action']).toBe('block');
  });

  it('deletes policy', async () => {
    // Create then delete (DELETE expects JSON body with category)
    await post(
      `/api/orgs/${orgId}/policies`,
      { category: 'temp-cat', action: 'block' },
      adminHeaders()
    );
    const res = await fetch(`${baseUrl}/api/orgs/${orgId}/policies`, {
      method: 'DELETE',
      headers: adminHeaders(),
      body: JSON.stringify({ category: 'temp-cat' }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json['ok']).toBe(true);

    // Verify deleted
    const { json: after } = await get(`/api/orgs/${orgId}/policies`, adminHeaders());
    const data = after['data'] as Array<Record<string, unknown>>;
    expect(data.find((p) => p['category'] === 'temp-cat')).toBeUndefined();
  });

  it('rejects policy without category', async () => {
    const { status } = await post(
      `/api/orgs/${orgId}/policies`,
      { action: 'block' },
      adminHeaders()
    );
    expect(status).toBe(400);
  });
});

// ── DELETE /api/rules/by-source ──────────────────────

describe('DELETE /api/rules/by-source', () => {
  it('rejects without admin key', async () => {
    const { status } = await del('/api/rules/by-source?source=yara', apiHeaders());
    expect(status).toBe(403);
  });

  it('refuses to delete atr source', async () => {
    const { status, json } = await del('/api/rules/by-source?source=atr', adminHeaders());
    expect(status).toBe(400);
    expect(json['ok']).toBe(false);
  });

  it('deletes rules by source', async () => {
    // Insert rules with custom source via POST /api/rules
    await post(
      '/api/rules',
      {
        rules: [
          { ruleId: 'YARA-001', ruleContent: 'title: Y1', source: 'yara' },
          { ruleId: 'YARA-002', ruleContent: 'title: Y2', source: 'yara' },
        ],
      },
      adminHeaders()
    );

    const { status, json } = await del('/api/rules/by-source?source=yara', adminHeaders());
    expect(status).toBe(200);
    expect(json['ok']).toBe(true);
    const data = json['data'] as Record<string, unknown>;
    expect(data['count']).toBe(2);
  });

  it('rejects missing source param', async () => {
    const { status } = await del('/api/rules/by-source', adminHeaders());
    expect(status).toBe(400);
  });
});
