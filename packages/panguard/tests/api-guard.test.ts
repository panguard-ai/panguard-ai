/**
 * Tests for GET /api/guard/status
 * Verifies guard engine status response format.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleGuardStatus } from '../src/server/api/guard.js';

// Mock PidFile so tests don't depend on filesystem
vi.mock('@openclaw/panguard-guard', () => ({
  PidFile: vi.fn().mockImplementation(() => ({
    read: () => null,
    isRunning: () => false,
  })),
}));

function request(
  server: Server,
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === 'string') return reject(new Error('Server not listening'));
    import('node:http').then((http) => {
      const req = http.request(
        { hostname: '127.0.0.1', port: (addr as { port: number }).port, path: '/api/guard/status', method: 'GET' },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            resolve({ status: res.statusCode ?? 500, data: JSON.parse(Buffer.concat(chunks).toString()) });
          });
        },
      );
      req.on('error', reject);
      req.end();
    }).catch(reject);
  });
}

describe('GET /api/guard/status', () => {
  let server: Server;

  afterEach(async () => {
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  it('should return ok: true with guard status structure', async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => handleGuardStatus(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

    const { status, data } = await request(server);
    expect(status).toBe(200);
    expect(data['ok']).toBe(true);

    const payload = data['data'] as Record<string, unknown>;
    expect(payload).toHaveProperty('running');
    expect(payload).toHaveProperty('pid');
    expect(payload).toHaveProperty('mode');
    expect(payload).toHaveProperty('agents');
    expect(payload).toHaveProperty('license');
    expect(payload).toHaveProperty('message');
  });

  it('should report guard as not running (mocked)', async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => handleGuardStatus(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

    const { data } = await request(server);
    const payload = data['data'] as Record<string, unknown>;
    expect(payload['running']).toBe(false);
    expect(payload['pid']).toBeNull();
    expect(payload['mode']).toBe('stopped');
  });

  it('should include 4 agents in pipeline', async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => handleGuardStatus(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

    const { data } = await request(server);
    const payload = data['data'] as Record<string, unknown>;
    const agents = payload['agents'] as Array<Record<string, unknown>>;
    expect(agents).toHaveLength(4);

    const names = agents.map(a => a['name']);
    expect(names).toContain('DetectAgent');
    expect(names).toContain('AnalyzeAgent');
    expect(names).toContain('RespondAgent');
    expect(names).toContain('ReportAgent');
  });

  it('should report all agents as stopped when guard is not running', async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => handleGuardStatus(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

    const { data } = await request(server);
    const agents = (data['data'] as Record<string, unknown>)['agents'] as Array<Record<string, unknown>>;
    for (const agent of agents) {
      expect(agent['status']).toBe('stopped');
    }
  });

  it('should include license tier info', async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => handleGuardStatus(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

    const { data } = await request(server);
    const license = (data['data'] as Record<string, unknown>)['license'] as Record<string, unknown>;
    expect(license).toHaveProperty('tier');
    expect(license).toHaveProperty('features');
    expect(Array.isArray(license['features'])).toBe(true);
  });
});
