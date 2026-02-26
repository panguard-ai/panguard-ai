/**
 * Tests for GET /api/status - System status endpoint
 * Verifies real module availability checks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleStatus } from '../src/server/api/status.js';

// Mock PidFile to avoid filesystem dependency
vi.mock('@openclaw/panguard-guard', () => ({
  PidFile: vi.fn().mockImplementation(() => ({
    read: () => null,
    isRunning: () => false,
  })),
}));

function createTestServer(handler: (req: IncomingMessage, res: ServerResponse) => void): Server {
  return createServer(handler);
}

function request(
  server: Server,
  path: string,
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === 'string') return reject(new Error('Server not listening'));
    const port = addr.port;
    import('node:http').then((http) => {
      const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          try {
            resolve({ status: res.statusCode ?? 500, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode ?? 500, data: { raw } });
          }
        });
      });
      req.on('error', reject);
      req.end();
    }).catch(reject);
  });
}

describe('GET /api/status', () => {
  let server: Server;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear chat-related env vars
    delete process.env['LINE_CHANNEL_ACCESS_TOKEN'];
    delete process.env['TELEGRAM_BOT_TOKEN'];
    delete process.env['SLACK_BOT_TOKEN'];
    delete process.env['SMTP_HOST'];
    delete process.env['WEBHOOK_ENDPOINT'];
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('should return ok: true with correct structure', async () => {
    server = createTestServer((req, res) => void handleStatus(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { status, data } = await request(server, '/api/status');
    expect(status).toBe(200);
    expect(data).toHaveProperty('ok', true);
    expect(data).toHaveProperty('data');

    const payload = data['data'] as Record<string, unknown>;
    expect(payload).toHaveProperty('version');
    expect(payload).toHaveProperty('modules');
    expect(payload).toHaveProperty('uptime');
    expect(payload).toHaveProperty('timestamp');
  });

  it('should report all 6 modules', async () => {
    server = createTestServer((req, res) => void handleStatus(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, '/api/status');
    const payload = data['data'] as Record<string, unknown>;
    const modules = payload['modules'] as Record<string, unknown>;

    expect(Object.keys(modules)).toHaveLength(6);
    expect(modules).toHaveProperty('scan');
    expect(modules).toHaveProperty('guard');
    expect(modules).toHaveProperty('report');
    expect(modules).toHaveProperty('chat');
    expect(modules).toHaveProperty('trap');
    expect(modules).toHaveProperty('threat');
  });

  it('should report scan, report, threat as always available', async () => {
    server = createTestServer((req, res) => void handleStatus(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, '/api/status');
    const modules = (data['data'] as Record<string, unknown>)['modules'] as Record<string, Record<string, unknown>>;

    expect(modules['scan']?.['available']).toBe(true);
    expect(modules['report']?.['available']).toBe(true);
    expect(modules['threat']?.['available']).toBe(true);
  });

  it('should report guard as unavailable when not running', async () => {
    server = createTestServer((req, res) => void handleStatus(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, '/api/status');
    const modules = (data['data'] as Record<string, unknown>)['modules'] as Record<string, Record<string, unknown>>;

    expect(modules['guard']?.['available']).toBe(false);
  });

  it('should report chat as unavailable when no env vars set', async () => {
    server = createTestServer((req, res) => void handleStatus(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, '/api/status');
    const modules = (data['data'] as Record<string, unknown>)['modules'] as Record<string, Record<string, unknown>>;

    expect(modules['chat']?.['available']).toBe(false);
  });

  it('should report chat as available when LINE env var is set', async () => {
    process.env['LINE_CHANNEL_ACCESS_TOKEN'] = 'test-token';

    server = createTestServer((req, res) => void handleStatus(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, '/api/status');
    const modules = (data['data'] as Record<string, unknown>)['modules'] as Record<string, Record<string, unknown>>;

    expect(modules['chat']?.['available']).toBe(true);
  });

  it('should report trap as unavailable when no ports are listening', async () => {
    server = createTestServer((req, res) => void handleStatus(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, '/api/status');
    const modules = (data['data'] as Record<string, unknown>)['modules'] as Record<string, Record<string, unknown>>;

    expect(modules['trap']?.['available']).toBe(false);
  });

  it('should include each module name and description', async () => {
    server = createTestServer((req, res) => void handleStatus(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, '/api/status');
    const modules = (data['data'] as Record<string, unknown>)['modules'] as Record<string, Record<string, unknown>>;

    for (const mod of Object.values(modules)) {
      expect(mod).toHaveProperty('name');
      expect(mod).toHaveProperty('available');
      expect(mod).toHaveProperty('description');
      expect(typeof mod['name']).toBe('string');
      expect(typeof mod['description']).toBe('string');
    }
  });
});
