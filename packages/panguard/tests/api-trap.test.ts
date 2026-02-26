/**
 * Tests for GET /api/trap/status
 * Verifies honeypot system status response format.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleTrapStatus } from '../src/server/api/trap.js';

function request(
  server: Server,
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === 'string') return reject(new Error('Server not listening'));
    import('node:http').then((http) => {
      const req = http.request(
        { hostname: '127.0.0.1', port: (addr as { port: number }).port, path: '/api/trap/status', method: 'GET' },
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

describe('GET /api/trap/status', () => {
  let server: Server;

  afterEach(async () => {
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  it('should return ok: true with trap status structure', async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => void handleTrapStatus(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

    const { status, data } = await request(server);
    expect(status).toBe(200);
    expect(data['ok']).toBe(true);

    const payload = data['data'] as Record<string, unknown>;
    expect(payload).toHaveProperty('running');
    expect(payload).toHaveProperty('services');
    expect(payload).toHaveProperty('activeServices');
    expect(payload).toHaveProperty('message');
  });

  it('should include 8 honeypot service definitions', async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => void handleTrapStatus(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

    const { data } = await request(server);
    const services = (data['data'] as Record<string, unknown>)['services'] as Array<Record<string, unknown>>;
    expect(services).toHaveLength(8);

    const types = services.map(s => s['type']);
    expect(types).toContain('ssh');
    expect(types).toContain('http');
    expect(types).toContain('ftp');
    expect(types).toContain('telnet');
    expect(types).toContain('mysql');
    expect(types).toContain('redis');
    expect(types).toContain('smb');
    expect(types).toContain('rdp');
  });

  it('should have correct fields for each service', async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => void handleTrapStatus(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

    const { data } = await request(server);
    const services = (data['data'] as Record<string, unknown>)['services'] as Array<Record<string, unknown>>;

    for (const svc of services) {
      expect(svc).toHaveProperty('type');
      expect(svc).toHaveProperty('port');
      expect(svc).toHaveProperty('enabled');
      expect(svc).toHaveProperty('listening');
      expect(typeof svc['port']).toBe('number');
      expect(typeof svc['enabled']).toBe('boolean');
      expect(typeof svc['listening']).toBe('boolean');
    }
  });

  it('should report no active services when none are listening', async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => void handleTrapStatus(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

    const { data } = await request(server);
    const payload = data['data'] as Record<string, unknown>;

    // In test environment no trap services are running
    expect(payload['running']).toBe(false);
    expect(payload['activeServices']).toBe(0);
  });

  it('should have SSH on port 2222 and HTTP on port 8080', async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => void handleTrapStatus(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

    const { data } = await request(server);
    const services = (data['data'] as Record<string, unknown>)['services'] as Array<Record<string, unknown>>;

    const ssh = services.find(s => s['type'] === 'ssh');
    expect(ssh?.['port']).toBe(2222);
    expect(ssh?.['enabled']).toBe(true);

    const http = services.find(s => s['type'] === 'http');
    expect(http?.['port']).toBe(8080);
    expect(http?.['enabled']).toBe(true);
  });
});
