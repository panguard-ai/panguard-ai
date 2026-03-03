/**
 * Policy push HTTP POST tests - Manager to Agent policy distribution
 * 策略推送 HTTP POST 測試 - Manager 至 Agent 策略分發
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Manager } from '../src/manager.js';
import type {
  ManagerConfig,
  AgentRegistrationRequest,
  PolicyUpdate,
  PolicyRule,
} from '../src/types.js';

const TEST_CONFIG: ManagerConfig = {
  port: 9443,
  authToken: 'test-auth-token',
  heartbeatIntervalMs: 60_000,
  heartbeatTimeoutMs: 90_000,
  maxAgents: 100,
  correlationWindowMs: 300_000,
  threatRetentionMs: 86_400_000,
};

function makeRegistration(
  hostname: string,
  endpoint?: string
): AgentRegistrationRequest {
  return {
    hostname,
    endpoint: endpoint ?? `http://${hostname}:8080`,
    os: 'Linux 6.1.0',
    arch: 'x64',
    version: '1.0.0',
    ip: '192.168.1.100',
  };
}

function makePolicy(overrides?: Partial<PolicyUpdate>): PolicyUpdate {
  return {
    policyId: 'pol-test0001',
    version: 1,
    rules: [
      {
        ruleId: 'r1',
        type: 'block_ip',
        condition: { ip: '10.0.0.42' },
        action: 'auto_block',
        severity: 'critical',
        description: 'Block attacker IP',
      },
    ],
    updatedAt: new Date().toISOString(),
    appliedTo: [],
    ...overrides,
  };
}

function makeRules(): PolicyRule[] {
  return [
    {
      ruleId: 'r1',
      type: 'block_ip',
      condition: { ip: '10.0.0.42' },
      action: 'auto_block',
      severity: 'critical',
      description: 'Block attacker IP',
    },
  ];
}

describe('Policy Push', () => {
  let manager: Manager;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    manager = new Manager(TEST_CONFIG);
    manager.start();
    // Save original fetch / 儲存原始 fetch
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    manager.stop();
    // Restore original fetch / 還原原始 fetch
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ===== pushPolicyToAgent / 推送策略至單一代理 =====

  describe('pushPolicyToAgent', () => {
    it('should POST policy to the correct agent endpoint', async () => {
      const reg = manager.handleRegistration(
        makeRegistration('server-01', 'http://192.168.1.10:8080')
      );
      const policy = makePolicy();

      const fetchCalls: { url: string; init: RequestInit }[] = [];
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ url: String(input), init: init ?? {} });
        return new Response('{"ok":true}', { status: 200 });
      };

      const result = await manager.pushPolicyToAgent(reg.agentId, policy);

      expect(result.success).toBe(true);
      expect(result.agentId).toBe(reg.agentId);
      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]!.url).toBe(
        'http://192.168.1.10:8080/api/policy/push'
      );
      expect(fetchCalls[0]!.init.method).toBe('POST');
    });

    it('should include policy and timestamp in the POST body', async () => {
      const reg = manager.handleRegistration(makeRegistration('server-01'));
      const policy = makePolicy();

      let capturedBody: unknown = null;
      globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('{"ok":true}', { status: 200 });
      };

      await manager.pushPolicyToAgent(reg.agentId, policy);

      expect(capturedBody).toBeDefined();
      const body = capturedBody as { policy: PolicyUpdate; timestamp: string };
      expect(body.policy.policyId).toBe('pol-test0001');
      expect(body.policy.version).toBe(1);
      expect(body.policy.rules).toHaveLength(1);
      expect(body.timestamp).toBeTruthy();
    });

    it('should include auth token in Authorization header when configured', async () => {
      const reg = manager.handleRegistration(makeRegistration('server-01'));
      const policy = makePolicy();

      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{"ok":true}', { status: 200 });
      };

      await manager.pushPolicyToAgent(reg.agentId, policy);

      expect(capturedHeaders['Authorization']).toBe('Bearer test-auth-token');
      expect(capturedHeaders['Content-Type']).toBe('application/json');
    });

    it('should not include Authorization header when authToken is empty', async () => {
      const noAuthConfig: ManagerConfig = { ...TEST_CONFIG, authToken: '' };
      const noAuthManager = new Manager(noAuthConfig);
      noAuthManager.start();

      const reg = noAuthManager.handleRegistration(
        makeRegistration('server-01')
      );
      const policy = makePolicy();

      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{"ok":true}', { status: 200 });
      };

      await noAuthManager.pushPolicyToAgent(reg.agentId, policy);

      expect(capturedHeaders['Authorization']).toBeUndefined();

      noAuthManager.stop();
    });

    it('should return failure when agent is not found in registry', async () => {
      const policy = makePolicy();

      const result = await manager.pushPolicyToAgent('ag-nonexistent', policy);

      expect(result.success).toBe(false);
      expect(result.agentId).toBe('ag-nonexistent');
      expect(result.error).toContain('not found');
    });

    it('should handle HTTP error responses', async () => {
      const reg = manager.handleRegistration(makeRegistration('server-01'));
      const policy = makePolicy();

      globalThis.fetch = async () =>
        new Response('Internal Server Error', { status: 500 });

      const result = await manager.pushPolicyToAgent(reg.agentId, policy);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 500');
    });

    it('should retry once on network failure', async () => {
      const reg = manager.handleRegistration(makeRegistration('server-01'));
      const policy = makePolicy();

      let callCount = 0;
      globalThis.fetch = async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Connection refused');
        }
        return new Response('{"ok":true}', { status: 200 });
      };

      const result = await manager.pushPolicyToAgent(reg.agentId, policy);

      expect(result.success).toBe(true);
      expect(callCount).toBe(2); // 1 failure + 1 retry
    });

    it('should return failure after retry exhaustion', async () => {
      const reg = manager.handleRegistration(makeRegistration('server-01'));
      const policy = makePolicy();

      let callCount = 0;
      globalThis.fetch = async () => {
        callCount++;
        throw new Error('Connection refused');
      };

      const result = await manager.pushPolicyToAgent(reg.agentId, policy);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
      expect(callCount).toBe(2); // 2 attempts total
    });

    it('should strip trailing slash from agent endpoint', async () => {
      const reg = manager.handleRegistration(
        makeRegistration('server-01', 'http://server-01:8080/')
      );
      const policy = makePolicy();

      let capturedUrl = '';
      globalThis.fetch = async (input: RequestInfo | URL) => {
        capturedUrl = String(input);
        return new Response('{"ok":true}', { status: 200 });
      };

      await manager.pushPolicyToAgent(reg.agentId, policy);

      expect(capturedUrl).toBe('http://server-01:8080/api/policy/push');
    });
  });

  // ===== broadcastPolicy / 廣播策略 =====

  describe('broadcastPolicy', () => {
    it('should push policy to all active agents', async () => {
      manager.handleRegistration(
        makeRegistration('server-01', 'http://server-01:8080')
      );
      manager.handleRegistration(
        makeRegistration('server-02', 'http://server-02:8080')
      );
      manager.handleRegistration(
        makeRegistration('server-03', 'http://server-03:8080')
      );

      const fetchUrls: string[] = [];
      globalThis.fetch = async (input: RequestInfo | URL) => {
        fetchUrls.push(String(input));
        return new Response('{"ok":true}', { status: 200 });
      };

      const policy = makePolicy();
      const result = await manager.broadcastPolicy(policy);

      expect(result.targetAgents).toHaveLength(3);
      expect(fetchUrls).toHaveLength(3);
      expect(fetchUrls).toContain('http://server-01:8080/api/policy/push');
      expect(fetchUrls).toContain('http://server-02:8080/api/policy/push');
      expect(fetchUrls).toContain('http://server-03:8080/api/policy/push');
    });

    it('should push policy only to specified agent IDs', async () => {
      const reg1 = manager.handleRegistration(
        makeRegistration('server-01', 'http://server-01:8080')
      );
      const reg2 = manager.handleRegistration(
        makeRegistration('server-02', 'http://server-02:8080')
      );
      manager.handleRegistration(
        makeRegistration('server-03', 'http://server-03:8080')
      );

      const fetchUrls: string[] = [];
      globalThis.fetch = async (input: RequestInfo | URL) => {
        fetchUrls.push(String(input));
        return new Response('{"ok":true}', { status: 200 });
      };

      const policy = makePolicy();
      const result = await manager.broadcastPolicy(policy, [
        reg1.agentId,
        reg2.agentId,
      ]);

      expect(result.targetAgents).toHaveLength(2);
      expect(fetchUrls).toHaveLength(2);
      expect(fetchUrls).toContain('http://server-01:8080/api/policy/push');
      expect(fetchUrls).toContain('http://server-02:8080/api/policy/push');
    });

    it('should collect per-agent results', async () => {
      const reg1 = manager.handleRegistration(
        makeRegistration('server-01', 'http://server-01:8080')
      );
      const reg2 = manager.handleRegistration(
        makeRegistration('server-02', 'http://server-02:8080')
      );

      // Server-01 succeeds, server-02 fails / server-01 成功，server-02 失敗
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('server-02')) {
          return new Response('Service Unavailable', { status: 503 });
        }
        return new Response('{"ok":true}', { status: 200 });
      };

      const policy = makePolicy();
      const result = await manager.broadcastPolicy(policy);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.agentResults).toHaveLength(2);

      const successResult = result.agentResults!.find(
        (r) => r.agentId === reg1.agentId
      );
      const failResult = result.agentResults!.find(
        (r) => r.agentId === reg2.agentId
      );

      expect(successResult!.success).toBe(true);
      expect(failResult!.success).toBe(false);
      expect(failResult!.error).toContain('HTTP 503');
    });

    it('should queue result to broadcastQueue', async () => {
      manager.handleRegistration(makeRegistration('server-01'));

      globalThis.fetch = async () =>
        new Response('{"ok":true}', { status: 200 });

      const policy = makePolicy();
      await manager.broadcastPolicy(policy);

      const pending = manager.getPendingBroadcasts();
      expect(pending).toHaveLength(1);
      expect(pending[0]!.policyId).toBe('pol-test0001');
    });

    it('should not make HTTP calls when no agents are active', async () => {
      let fetchCalled = false;
      globalThis.fetch = async () => {
        fetchCalled = true;
        return new Response('{"ok":true}', { status: 200 });
      };

      const policy = makePolicy();
      const result = await manager.broadcastPolicy(policy);

      expect(result.targetAgents).toHaveLength(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(fetchCalled).toBe(false);
    });

    it('should not make HTTP calls when targetAgentIds is empty', async () => {
      manager.handleRegistration(makeRegistration('server-01'));

      let fetchCalled = false;
      globalThis.fetch = async () => {
        fetchCalled = true;
        return new Response('{"ok":true}', { status: 200 });
      };

      const policy = makePolicy();
      const result = await manager.broadcastPolicy(policy, []);

      expect(result.targetAgents).toHaveLength(0);
      expect(fetchCalled).toBe(false);
    });

    it('should handle mixed success and failure across agents', async () => {
      manager.handleRegistration(
        makeRegistration('server-01', 'http://server-01:8080')
      );
      manager.handleRegistration(
        makeRegistration('server-02', 'http://server-02:8080')
      );
      manager.handleRegistration(
        makeRegistration('server-03', 'http://server-03:8080')
      );

      // server-01 OK, server-02 fails, server-03 OK
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('server-02')) {
          throw new Error('ECONNREFUSED');
        }
        return new Response('{"ok":true}', { status: 200 });
      };

      const policy = makePolicy();
      const result = await manager.broadcastPolicy(policy);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });
  });

  // ===== createPolicy with broadcast / 建立策略並廣播 =====

  describe('createPolicy with broadcast', () => {
    it('should broadcast policy to all active agents when broadcast=true', async () => {
      manager.handleRegistration(makeRegistration('server-01'));
      manager.handleRegistration(makeRegistration('server-02'));

      let fetchCallCount = 0;
      globalThis.fetch = async () => {
        fetchCallCount++;
        return new Response('{"ok":true}', { status: 200 });
      };

      await manager.createPolicy(makeRules(), true);

      // Each agent receives a POST / 每個代理收到一次 POST
      expect(fetchCallCount).toBe(2);
    });

    it('should not broadcast when broadcast=false', async () => {
      manager.handleRegistration(makeRegistration('server-01'));

      let fetchCalled = false;
      globalThis.fetch = async () => {
        fetchCalled = true;
        return new Response('{"ok":true}', { status: 200 });
      };

      await manager.createPolicy(makeRules(), false);

      expect(fetchCalled).toBe(false);
    });
  });

  // ===== Policy validation in POST body / POST 內容中的策略驗證 =====

  describe('policy structure validation', () => {
    it('should send correct policy structure in POST body', async () => {
      const reg = manager.handleRegistration(makeRegistration('server-01'));
      const policy = makePolicy({
        policyId: 'pol-abc12345',
        version: 3,
        rules: [
          {
            ruleId: 'r1',
            type: 'alert_threshold',
            condition: { threshold: 100 },
            action: 'notify',
            severity: 'medium',
            description: 'Threshold alert',
          },
          {
            ruleId: 'r2',
            type: 'block_ip',
            condition: { ip: '10.0.0.1' },
            action: 'auto_block',
            severity: 'critical',
            description: 'Block attacker',
          },
        ],
        appliedTo: [reg.agentId],
      });

      let capturedBody: unknown = null;
      globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('{"ok":true}', { status: 200 });
      };

      await manager.pushPolicyToAgent(reg.agentId, policy);

      const body = capturedBody as { policy: PolicyUpdate; timestamp: string };
      expect(body.policy.policyId).toBe('pol-abc12345');
      expect(body.policy.version).toBe(3);
      expect(body.policy.rules).toHaveLength(2);
      expect(body.policy.rules[0]!.ruleId).toBe('r1');
      expect(body.policy.rules[1]!.ruleId).toBe('r2');
      expect(body.policy.appliedTo).toContain(reg.agentId);
      expect(typeof body.timestamp).toBe('string');
      // Verify timestamp is valid ISO 8601
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });
  });

  // ===== Error handling edge cases / 錯誤處理邊緣案例 =====

  describe('error handling edge cases', () => {
    it('should handle timeout (AbortSignal.timeout)', async () => {
      const reg = manager.handleRegistration(makeRegistration('server-01'));
      const policy = makePolicy();

      globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
        // Simulate the abort signal timeout by throwing AbortError
        const signal = init?.signal;
        if (signal) {
          const abortError = new DOMException('The operation was aborted.', 'AbortError');
          throw abortError;
        }
        return new Response('{"ok":true}', { status: 200 });
      };

      const result = await manager.pushPolicyToAgent(reg.agentId, policy);

      // Should fail after retry attempts / 重試後應失敗
      expect(result.success).toBe(false);
      expect(result.error).toContain('aborted');
    });

    it('should handle non-Error thrown values', async () => {
      const reg = manager.handleRegistration(makeRegistration('server-01'));
      const policy = makePolicy();

      globalThis.fetch = async () => {
        throw 'string error value';
      };

      const result = await manager.pushPolicyToAgent(reg.agentId, policy);

      expect(result.success).toBe(false);
      expect(result.error).toContain('string error value');
    });

    it('should handle all agents failing in broadcast gracefully', async () => {
      manager.handleRegistration(makeRegistration('server-01'));
      manager.handleRegistration(makeRegistration('server-02'));

      globalThis.fetch = async () => {
        throw new Error('Network unreachable');
      };

      const policy = makePolicy();
      const result = await manager.broadcastPolicy(policy);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);
      expect(result.agentResults!.every((r) => !r.success)).toBe(true);
    });
  });
});
