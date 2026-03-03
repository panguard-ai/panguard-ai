/**
 * ManagerServer HTTP API integration tests
 * ManagerServer HTTP API 整合測試
 *
 * Tests the full HTTP request/response cycle by starting
 * a real server on a high port and making fetch requests.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ManagerServer } from '../src/server.js';
import type { ManagerConfig, PolicyRule } from '../src/types.js';
import { DEFAULT_MANAGER_CONFIG } from '../src/types.js';

// ===== Test Constants =====

const TEST_TOKEN = 'test-auth-token-12345';
const TEST_PORT = 19876;

// ===== Helpers =====

function makeConfig(overrides?: Partial<ManagerConfig>): ManagerConfig {
  return {
    ...DEFAULT_MANAGER_CONFIG,
    port: TEST_PORT,
    authToken: TEST_TOKEN,
    heartbeatIntervalMs: 60_000, // Long interval to avoid timer interference
    ...overrides,
  };
}

async function request(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  return fetch(`http://127.0.0.1:${TEST_PORT}${path}`, {
    ...options,
    headers,
  });
}

function makeRegistrationBody() {
  return {
    hostname: `server-${Math.random().toString(36).slice(2, 8)}`,
    os: 'Linux 6.1.0',
    arch: 'x64',
    version: '1.0.0',
    ip: '192.168.1.100',
    endpoint: 'http://127.0.0.1:1',
  };
}

function makeHeartbeatBody() {
  return {
    timestamp: new Date().toISOString(),
    cpuUsage: 35,
    memUsage: 2048,
    activeMonitors: 4,
    threatCount: 0,
    eventsProcessed: 500,
    mode: 'protection',
    uptime: 60_000,
  };
}

function makeThreatEventBody() {
  return {
    event: {
      id: `evt-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      source: 'network',
      severity: 'high',
      category: 'lateral_movement',
      description: 'Suspicious network activity',
      raw: {},
      host: 'test-host',
      metadata: { sourceIP: '10.0.0.42' },
    },
    verdict: {
      conclusion: 'malicious',
      confidence: 90,
      action: 'block_ip',
    },
  };
}

function makePolicyRules(): PolicyRule[] {
  return [
    {
      ruleId: 'rule-001',
      type: 'block_ip',
      condition: { repeatCount: 3 },
      action: 'auto_block',
      severity: 'high',
      description: 'Block IP after 3 failed attempts',
    },
  ];
}

// ===== Test Suite =====

describe('ManagerServer HTTP API', () => {
  let server: ManagerServer;

  beforeAll(async () => {
    server = new ManagerServer(makeConfig());
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  // ===== Health Check =====

  describe('GET /health', () => {
    it('should return 200 with healthy status', async () => {
      const res = await request('/health');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.status).toBe('healthy');
      expect(body.data.running).toBe(true);
      expect(typeof body.data.uptime).toBe('number');
      expect(typeof body.data.agents).toBe('number');
    });

    it('should not require authentication', async () => {
      // Request without Authorization header
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`, {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  // ===== Auth =====

  describe('authentication', () => {
    it('should return 401 when no auth token is provided', async () => {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/agents`, {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 with an invalid token', async () => {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/agents`, {
        headers: {
          Authorization: 'Bearer wrong-token',
          'Content-Type': 'application/json',
        },
      });
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.ok).toBe(false);
    });

    it('should return 401 with malformed Authorization header', async () => {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/agents`, {
        headers: {
          Authorization: 'NotBearer some-token',
          'Content-Type': 'application/json',
        },
      });
      expect(res.status).toBe(401);
    });

    it('should succeed with valid Bearer token', async () => {
      const res = await request('/api/agents');
      expect(res.status).toBe(200);
    });
  });

  // ===== Agent Registration =====

  describe('POST /api/agents/register', () => {
    it('should register a new agent and return 201', async () => {
      const regBody = makeRegistrationBody();
      const res = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify(regBody),
      });

      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.agentId).toMatch(/^ag-/);
      expect(body.data.hostname).toBe(regBody.hostname);
      expect(body.data.status).toBe('online');
      expect(body.data.platform.os).toBe('Linux 6.1.0');
      expect(body.data.platform.arch).toBe('x64');
    });

    it('should return 400 when hostname is missing', async () => {
      const res = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify({ os: 'Linux', arch: 'x64', version: '1.0.0' }),
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 when os is missing', async () => {
      const res = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify({
          hostname: 'test-host',
          arch: 'x64',
          version: '1.0.0',
        }),
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.ok).toBe(false);
    });

    it('should return 400 when arch is missing', async () => {
      const res = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify({
          hostname: 'test-host',
          os: 'Linux',
          version: '1.0.0',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 when version is missing', async () => {
      const res = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify({
          hostname: 'test-host',
          os: 'Linux',
          arch: 'x64',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 with empty body', async () => {
      const res = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  // ===== Agent Heartbeat =====

  describe('POST /api/agents/:id/heartbeat', () => {
    it('should update agent and return 200', async () => {
      // Register first
      const regRes = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify(makeRegistrationBody()),
      });
      const { data: reg } = await regRes.json();

      // Send heartbeat
      const res = await request(`/api/agents/${reg.agentId}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify(makeHeartbeatBody()),
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.agentId).toBe(reg.agentId);
    });

    it('should return 404 for unknown agent', async () => {
      const res = await request('/api/agents/ag-nonexistent/heartbeat', {
        method: 'POST',
        body: JSON.stringify(makeHeartbeatBody()),
      });

      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('not found');
    });

    it('should return 400 with invalid JSON body', async () => {
      // Register first
      const regRes = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify(makeRegistrationBody()),
      });
      const { data: reg } = await regRes.json();

      const res = await fetch(
        `http://127.0.0.1:${TEST_PORT}/api/agents/${reg.agentId}/heartbeat`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: 'not-valid-json',
        }
      );

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.ok).toBe(false);
    });
  });

  // ===== Agent List & Details =====

  describe('GET /api/agents', () => {
    it('should return list of agents', async () => {
      const res = await request('/api/agents');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /api/agents/:id', () => {
    it('should return a single registered agent', async () => {
      // Register
      const regRes = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify(makeRegistrationBody()),
      });
      const { data: reg } = await regRes.json();

      // Fetch
      const res = await request(`/api/agents/${reg.agentId}`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.agentId).toBe(reg.agentId);
      expect(body.data.hostname).toBe(reg.hostname);
    });

    it('should return 404 for unknown agent', async () => {
      const res = await request('/api/agents/ag-does-not-exist');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('not found');
    });
  });

  // ===== Agent Deregistration =====

  describe('DELETE /api/agents/:id', () => {
    it('should remove agent and return 200', async () => {
      // Register
      const regRes = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify(makeRegistrationBody()),
      });
      const { data: reg } = await regRes.json();

      // Delete
      const res = await request(`/api/agents/${reg.agentId}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.agentId).toBe(reg.agentId);
      expect(body.data.removed).toBe(true);

      // Verify agent is gone
      const getRes = await request(`/api/agents/${reg.agentId}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for unknown agent', async () => {
      const res = await request('/api/agents/ag-unknown-delete', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('not found');
    });
  });

  // ===== Threat Reporting =====

  describe('POST /api/agents/:id/events', () => {
    it('should accept a threat report and return 200', async () => {
      // Register agent
      const regRes = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify(makeRegistrationBody()),
      });
      const { data: reg } = await regRes.json();

      // Submit threat
      const res = await request(`/api/agents/${reg.agentId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          threats: [makeThreatEventBody()],
          reportedAt: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.accepted).toBe(1);
      expect(Array.isArray(body.data.threats)).toBe(true);
      expect(body.data.threats).toHaveLength(1);
      expect(body.data.threats[0].sourceAgentId).toBe(reg.agentId);
    });

    it('should accept multiple threats in one report', async () => {
      const regRes = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify(makeRegistrationBody()),
      });
      const { data: reg } = await regRes.json();

      const res = await request(`/api/agents/${reg.agentId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          threats: [makeThreatEventBody(), makeThreatEventBody(), makeThreatEventBody()],
          reportedAt: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.accepted).toBe(3);
    });

    it('should return 400 when threats array is missing', async () => {
      const regRes = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify(makeRegistrationBody()),
      });
      const { data: reg } = await regRes.json();

      const res = await request(`/api/agents/${reg.agentId}/events`, {
        method: 'POST',
        body: JSON.stringify({ reportedAt: new Date().toISOString() }),
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('threats array required');
    });

    it('should return 400 when threats is not an array', async () => {
      const regRes = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify(makeRegistrationBody()),
      });
      const { data: reg } = await regRes.json();

      const res = await request(`/api/agents/${reg.agentId}/events`, {
        method: 'POST',
        body: JSON.stringify({ threats: 'not-an-array' }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ===== Threats Query =====

  describe('GET /api/threats', () => {
    it('should return recent threats', async () => {
      const res = await request('/api/threats');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should support since query parameter', async () => {
      const since = new Date(Date.now() - 600_000).toISOString();
      const res = await request(`/api/threats?since=${encodeURIComponent(since)}`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /api/threats/summary', () => {
    it('should return threat summary', async () => {
      const res = await request('/api/threats/summary');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(typeof body.data.totalThreats).toBe('number');
      expect(typeof body.data.criticalCount).toBe('number');
      expect(typeof body.data.highCount).toBe('number');
      expect(typeof body.data.suspiciousCount).toBe('number');
      expect(typeof body.data.uniqueAttackers).toBe('number');
      expect(typeof body.data.affectedAgents).toBe('number');
      expect(typeof body.data.correlatedGroups).toBe('number');
    });
  });

  // ===== Policy Management =====

  describe('POST /api/policy', () => {
    it('should create a new policy and return 201', async () => {
      const res = await request('/api/policy', {
        method: 'POST',
        body: JSON.stringify({ rules: makePolicyRules(), broadcast: false }),
      });

      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.policyId).toMatch(/^pol-/);
      expect(body.data.rules).toHaveLength(1);
      expect(typeof body.data.version).toBe('number');
      expect(body.data.updatedAt).toBeDefined();
    });

    it('should return 400 when rules array is missing', async () => {
      const res = await request('/api/policy', {
        method: 'POST',
        body: JSON.stringify({ broadcast: true }),
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('rules array required');
    });

    it('should return 400 when rules is not an array', async () => {
      const res = await request('/api/policy', {
        method: 'POST',
        body: JSON.stringify({ rules: 'not-an-array' }),
      });

      expect(res.status).toBe(400);
    });

    it('should default broadcast to true', async () => {
      // Register an agent so broadcast has a target
      await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify(makeRegistrationBody()),
      });

      const res = await request('/api/policy', {
        method: 'POST',
        body: JSON.stringify({ rules: makePolicyRules() }),
      });

      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  describe('GET /api/policy/active', () => {
    it('should return the active policy or null', async () => {
      const res = await request('/api/policy/active');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      // data is either a policy object or null
      if (body.data !== null) {
        expect(body.data.policyId).toBeDefined();
        expect(body.data.rules).toBeDefined();
      }
    });
  });

  describe('GET /api/policy/agent/:id', () => {
    it('should return policy for a specific agent', async () => {
      // Create a policy first
      await request('/api/policy', {
        method: 'POST',
        body: JSON.stringify({ rules: makePolicyRules(), broadcast: false }),
      });

      const res = await request('/api/policy/agent/ag-test-agent');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      // Returns active global policy or null
    });
  });

  // ===== Overview =====

  describe('GET /api/overview', () => {
    it('should return dashboard overview', async () => {
      const res = await request('/api/overview');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(typeof body.data.totalAgents).toBe('number');
      expect(typeof body.data.onlineAgents).toBe('number');
      expect(typeof body.data.staleAgents).toBe('number');
      expect(typeof body.data.offlineAgents).toBe('number');
      expect(Array.isArray(body.data.agents)).toBe(true);
      expect(body.data.threatSummary).toBeDefined();
      expect(typeof body.data.activePolicyVersion).toBe('number');
      expect(typeof body.data.uptimeMs).toBe('number');
    });
  });

  // ===== Error Handling =====

  describe('error handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request('/nonexistent');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe('Not found');
    });

    it('should return 404 for unknown API paths', async () => {
      const res = await request('/api/unknown/path');
      expect(res.status).toBe(404);
    });

    it('should return 415 for POST without application/json Content-Type', async () => {
      const res = await fetch(
        `http://127.0.0.1:${TEST_PORT}/api/agents/register`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'text/plain',
          },
          body: 'not json',
        }
      );

      expect(res.status).toBe(415);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('application/json');
    });

    it('should return 415 for POST with no Content-Type header', async () => {
      const res = await fetch(
        `http://127.0.0.1:${TEST_PORT}/api/agents/register`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${TEST_TOKEN}`,
          },
          body: '{}',
        }
      );

      expect(res.status).toBe(415);
    });

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/agents`, {
        method: 'OPTIONS',
      });

      expect(res.status).toBe(204);
    });
  });

  // ===== Security Headers =====

  describe('security headers', () => {
    it('should include security headers in responses', async () => {
      const res = await request('/health');

      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      expect(res.headers.get('x-xss-protection')).toBe('0');
      expect(res.headers.get('referrer-policy')).toBe(
        'strict-origin-when-cross-origin'
      );
      expect(res.headers.get('content-type')).toBe('application/json');
    });
  });

  // ===== Full Lifecycle =====

  describe('full lifecycle via HTTP', () => {
    it('should handle register, heartbeat, report, query, deregister', async () => {
      // Step 1: Register an agent
      const regRes = await request('/api/agents/register', {
        method: 'POST',
        body: JSON.stringify({
          hostname: 'lifecycle-test-host',
          os: 'Linux 6.1.0',
          arch: 'x64',
          version: '2.0.0',
        }),
      });
      expect(regRes.status).toBe(201);
      const { data: registration } = await regRes.json();
      const agentId = registration.agentId;

      // Step 2: Verify agent appears in list
      const listRes = await request('/api/agents');
      const { data: agentList } = await listRes.json();
      const found = agentList.find(
        (a: { agentId: string }) => a.agentId === agentId
      );
      expect(found).toBeDefined();

      // Step 3: Send heartbeat
      const hbRes = await request(`/api/agents/${agentId}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify(makeHeartbeatBody()),
      });
      expect(hbRes.status).toBe(200);

      // Step 4: Submit threat report
      const threatRes = await request(`/api/agents/${agentId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          threats: [makeThreatEventBody()],
          reportedAt: new Date().toISOString(),
        }),
      });
      expect(threatRes.status).toBe(200);
      const { data: threatData } = await threatRes.json();
      expect(threatData.accepted).toBe(1);

      // Step 5: Query threats
      const threatsRes = await request('/api/threats');
      expect(threatsRes.status).toBe(200);
      const { data: threats } = await threatsRes.json();
      expect(threats.length).toBeGreaterThan(0);

      // Step 6: Query summary
      const summaryRes = await request('/api/threats/summary');
      expect(summaryRes.status).toBe(200);
      const { data: summary } = await summaryRes.json();
      expect(summary.totalThreats).toBeGreaterThan(0);

      // Step 7: Check overview
      const overviewRes = await request('/api/overview');
      expect(overviewRes.status).toBe(200);
      const { data: overview } = await overviewRes.json();
      expect(overview.totalAgents).toBeGreaterThan(0);

      // Step 8: Deregister
      const deleteRes = await request(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });
      expect(deleteRes.status).toBe(200);

      // Step 9: Verify agent is gone
      const getRes = await request(`/api/agents/${agentId}`);
      expect(getRes.status).toBe(404);
    });
  });
});

// ===== No-Auth Mode Server Tests =====

describe('ManagerServer without auth token', () => {
  let noAuthServer: ManagerServer;
  const NO_AUTH_PORT = 19877;

  beforeAll(async () => {
    noAuthServer = new ManagerServer(
      makeConfig({ authToken: '', port: NO_AUTH_PORT })
    );
    await noAuthServer.start();
  });

  afterAll(async () => {
    await noAuthServer.stop();
  });

  it('should allow requests without Authorization header when no token configured', async () => {
    const res = await fetch(`http://127.0.0.1:${NO_AUTH_PORT}/api/agents`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('should allow registration without auth', async () => {
    const res = await fetch(
      `http://127.0.0.1:${NO_AUTH_PORT}/api/agents/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeRegistrationBody()),
      }
    );

    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
