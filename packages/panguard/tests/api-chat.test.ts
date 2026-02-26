/**
 * Tests for /api/chat/* endpoints
 * Verifies notification channel status and test notification.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleChatStatus, handleChatTest } from '../src/server/api/chat.js';

function createTestServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>,
): Server {
  return createServer((req, res) => void handler(req, res));
}

function request(
  server: Server,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === 'string') return reject(new Error('Server not listening'));
    const port = addr.port;
    import('node:http').then((http) => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path, method, headers: { 'Content-Type': 'application/json' } },
        (res) => {
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
        },
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    }).catch(reject);
  });
}

describe('GET /api/chat/status', () => {
  let server: Server;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all notification env vars
    delete process.env['LINE_CHANNEL_ACCESS_TOKEN'];
    delete process.env['LINE_CHANNEL_SECRET'];
    delete process.env['TELEGRAM_BOT_TOKEN'];
    delete process.env['TELEGRAM_CHAT_ID'];
    delete process.env['SLACK_BOT_TOKEN'];
    delete process.env['SLACK_SIGNING_SECRET'];
    delete process.env['SMTP_HOST'];
    delete process.env['SMTP_USER'];
    delete process.env['WEBHOOK_ENDPOINT'];
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('should return ok: true with 5 channels', async () => {
    server = createTestServer(handleChatStatus);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { status, data } = await request(server, 'GET', '/api/chat/status');
    expect(status).toBe(200);
    expect(data).toHaveProperty('ok', true);

    const payload = data['data'] as Record<string, unknown>;
    expect(payload).toHaveProperty('channels');
    expect(payload).toHaveProperty('configuredCount', 0);
    expect(payload).toHaveProperty('totalChannels', 5);
    expect(payload).toHaveProperty('preferences');

    const channels = payload['channels'] as Array<Record<string, unknown>>;
    expect(channels).toHaveLength(5);
  });

  it('should report all channels as unconfigured by default', async () => {
    server = createTestServer(handleChatStatus);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, 'GET', '/api/chat/status');
    const channels = (data['data'] as Record<string, unknown>)['channels'] as Array<Record<string, unknown>>;

    for (const ch of channels) {
      expect(ch['configured']).toBe(false);
    }
  });

  it('should detect LINE as configured when both env vars are set', async () => {
    process.env['LINE_CHANNEL_ACCESS_TOKEN'] = 'test-token';
    process.env['LINE_CHANNEL_SECRET'] = 'test-secret';

    server = createTestServer(handleChatStatus);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, 'GET', '/api/chat/status');
    const payload = data['data'] as Record<string, unknown>;
    expect(payload['configuredCount']).toBe(1);

    const channels = payload['channels'] as Array<Record<string, unknown>>;
    const line = channels.find(c => c['type'] === 'line');
    expect(line?.['configured']).toBe(true);
  });

  it('should detect Slack as configured when both env vars are set', async () => {
    process.env['SLACK_BOT_TOKEN'] = 'xoxb-test';
    process.env['SLACK_SIGNING_SECRET'] = 'test-secret';

    server = createTestServer(handleChatStatus);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, 'GET', '/api/chat/status');
    const channels = (data['data'] as Record<string, unknown>)['channels'] as Array<Record<string, unknown>>;
    const slack = channels.find(c => c['type'] === 'slack');
    expect(slack?.['configured']).toBe(true);
  });

  it('should include envHint for each channel', async () => {
    server = createTestServer(handleChatStatus);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { data } = await request(server, 'GET', '/api/chat/status');
    const channels = (data['data'] as Record<string, unknown>)['channels'] as Array<Record<string, unknown>>;

    for (const ch of channels) {
      expect(ch).toHaveProperty('envHint');
      expect(typeof ch['envHint']).toBe('string');
      expect((ch['envHint'] as string).length).toBeGreaterThan(0);
    }
  });
});

describe('POST /api/chat/test', () => {
  let server: Server;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env['LINE_CHANNEL_ACCESS_TOKEN'];
    delete process.env['LINE_CHANNEL_SECRET'];
    delete process.env['SLACK_BOT_TOKEN'];
    delete process.env['SLACK_SIGNING_SECRET'];
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('should return 400 for invalid JSON body', async () => {
    server = createServer((req, res) => void handleChatTest(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('not listening');
    const port = (addr as { port: number }).port;

    const result = await new Promise<{ status: number; data: Record<string, unknown> }>((resolve, reject) => {
      import('node:http').then((http) => {
        const req = http.request(
          { hostname: '127.0.0.1', port, path: '/api/chat/test', method: 'POST', headers: { 'Content-Type': 'application/json' } },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => {
              const raw = Buffer.concat(chunks).toString('utf-8');
              resolve({ status: res.statusCode ?? 500, data: JSON.parse(raw) });
            });
          },
        );
        req.on('error', reject);
        req.write('not-json');
        req.end();
      }).catch(reject);
    });

    expect(result.status).toBe(400);
    expect(result.data['ok']).toBe(false);
  });

  it('should return 400 for missing channel field', async () => {
    server = createTestServer(handleChatTest);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { status, data } = await request(server, 'POST', '/api/chat/test', {});
    expect(status).toBe(400);
    expect(data['ok']).toBe(false);
    expect(data['error']).toContain('channel');
  });

  it('should return 400 for unknown channel type', async () => {
    server = createTestServer(handleChatTest);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { status, data } = await request(server, 'POST', '/api/chat/test', { channel: 'discord' });
    expect(status).toBe(400);
    expect(data['ok']).toBe(false);
    expect(data['error']).toContain('Unknown');
  });

  it('should return 400 for invalid channel value (too long)', async () => {
    server = createTestServer(handleChatTest);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { status, data } = await request(server, 'POST', '/api/chat/test', { channel: 'a'.repeat(100) });
    expect(status).toBe(400);
    expect(data['ok']).toBe(false);
    expect(data['error']).toContain('Invalid');
  });

  it('should return 400 for unconfigured channel', async () => {
    server = createTestServer(handleChatTest);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { status, data } = await request(server, 'POST', '/api/chat/test', { channel: 'line' });
    expect(status).toBe(400);
    expect(data['ok']).toBe(false);
    expect(data['error']).toContain('not configured');
  });

  it('should return 200 for configured channel', async () => {
    process.env['LINE_CHANNEL_ACCESS_TOKEN'] = 'test-token';
    process.env['LINE_CHANNEL_SECRET'] = 'test-secret';

    server = createTestServer(handleChatTest);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const { status, data } = await request(server, 'POST', '/api/chat/test', { channel: 'line' });
    expect(status).toBe(200);
    expect(data['ok']).toBe(true);
    expect(data['data']).toHaveProperty('sent', true);
  });
});
