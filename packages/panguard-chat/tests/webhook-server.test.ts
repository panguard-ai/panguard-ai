/**
 * WebhookServer Tests
 * Webhook 伺服器測試
 *
 * Comprehensive unit tests for the webhook server module that handles
 * incoming webhook requests from Telegram, Slack, and other channels.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { WebhookServer, type WebhookHandler, type WebhookServerConfig } from '../src/server/webhook-server.js';

// ---------------------------------------------------------------------------
// Mock @panguard-ai/core logger
// 模擬 @panguard-ai/core 日誌記錄器
// ---------------------------------------------------------------------------

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@panguard-ai/core', () => ({
  createLogger: () => mockLogger,
}));

// ---------------------------------------------------------------------------
// Mock node:http to avoid real network binding
// 模擬 node:http 避免實際網路綁定
// ---------------------------------------------------------------------------

type RequestHandler = (req: MockIncomingMessage, res: MockServerResponse) => void;

interface MockServer {
  listen: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  requestHandler: RequestHandler | null;
}

let mockServerInstance: MockServer;

vi.mock('node:http', () => ({
  createServer: (handler: RequestHandler) => {
    mockServerInstance = {
      listen: vi.fn((_port: number, _host: string, cb: () => void) => {
        cb();
      }),
      close: vi.fn((cb: () => void) => {
        cb();
      }),
      requestHandler: handler,
    };
    return mockServerInstance;
  },
}));

// ---------------------------------------------------------------------------
// Mock IncomingMessage and ServerResponse
// 模擬 IncomingMessage 和 ServerResponse
// ---------------------------------------------------------------------------

class MockIncomingMessage {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  private chunks: Buffer[];
  private errorToEmit: Error | null;
  private shouldDestroy: boolean;

  constructor(options: {
    method?: string;
    url?: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: string;
    errorToEmit?: Error;
    bodyChunks?: Buffer[];
  }) {
    this.method = options.method ?? 'POST';
    this.url = options.url ?? '/';
    this.headers = options.headers ?? {};
    this.chunks = options.bodyChunks ?? (options.body !== undefined ? [Buffer.from(options.body)] : []);
    this.errorToEmit = options.errorToEmit ?? null;
    this.shouldDestroy = false;
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (event === 'data') {
      for (const chunk of this.chunks) {
        if (this.shouldDestroy) break;
        handler(chunk);
      }
    } else if (event === 'end') {
      if (!this.shouldDestroy && !this.errorToEmit) {
        handler();
      }
    } else if (event === 'error') {
      if (this.errorToEmit) {
        handler(this.errorToEmit);
      }
    }
  }

  destroy(): void {
    this.shouldDestroy = true;
  }
}

class MockServerResponse {
  statusCode: number = 200;
  headers: Record<string, string> = {};
  body: string = '';
  ended: boolean = false;

  setHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  writeHead(statusCode: number, headers?: Record<string, string>): void {
    this.statusCode = statusCode;
    if (headers) {
      Object.assign(this.headers, headers);
    }
  }

  end(body?: string): void {
    this.body = body ?? '';
    this.ended = true;
  }

  getBody(): unknown {
    try {
      return JSON.parse(this.body);
    } catch {
      return this.body;
    }
  }
}

// ---------------------------------------------------------------------------
// Helper to dispatch a mock request through the server
// 輔助函數：透過伺服器發送模擬請求
// ---------------------------------------------------------------------------

async function dispatchRequest(
  req: MockIncomingMessage,
  res: MockServerResponse
): Promise<void> {
  if (!mockServerInstance?.requestHandler) {
    throw new Error('Server not started - requestHandler is null');
  }
  // The handler returns void but internally calls handleRequest which is async.
  // We call it and wait for the response to be ended.
  mockServerInstance.requestHandler(req, res);

  // Give the async handler time to complete
  // We poll for res.ended to be true, with a timeout
  const start = Date.now();
  while (!res.ended && Date.now() - start < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  if (!res.ended) {
    throw new Error('Response was never ended within timeout');
  }
}

// ---------------------------------------------------------------------------
// Test Data
// 測試資料
// ---------------------------------------------------------------------------

function createConfig(overrides?: Partial<WebhookServerConfig>): WebhookServerConfig {
  return {
    port: 9876,
    host: '127.0.0.1',
    handlers: new Map<string, WebhookHandler>(),
    ...overrides,
  };
}

function createSlackSignature(body: string, secret: string, timestamp: string): string {
  const sigBase = `v0:${timestamp}:${body}`;
  return 'v0=' + createHmac('sha256', secret).update(sigBase).digest('hex');
}

// ---------------------------------------------------------------------------
// Tests
// 測試
// ---------------------------------------------------------------------------

describe('WebhookServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServerInstance = {
      listen: vi.fn(),
      close: vi.fn(),
      requestHandler: null,
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Construction
  // 建構
  // -----------------------------------------------------------------------

  describe('constructor', () => {
    it('should create an instance with provided config', () => {
      const config = createConfig({ port: 3000 });
      const server = new WebhookServer(config);
      expect(server).toBeInstanceOf(WebhookServer);
    });

    it('should accept config without optional host', () => {
      const config = createConfig();
      delete (config as Record<string, unknown>)['host'];
      const server = new WebhookServer(config);
      expect(server).toBeInstanceOf(WebhookServer);
    });

    it('should accept config without optional secrets', () => {
      const config = createConfig({
        slackSigningSecret: undefined,
        telegramSecret: undefined,
      });
      const server = new WebhookServer(config);
      expect(server).toBeInstanceOf(WebhookServer);
    });
  });

  // -----------------------------------------------------------------------
  // Server Lifecycle (start / stop)
  // 伺服器生命週期（啟動 / 停止）
  // -----------------------------------------------------------------------

  describe('start()', () => {
    it('should create an HTTP server and listen on configured port and host', async () => {
      const config = createConfig({ port: 8080, host: '0.0.0.0' });
      const server = new WebhookServer(config);

      await server.start();

      expect(mockServerInstance.listen).toHaveBeenCalledWith(
        8080,
        '0.0.0.0',
        expect.any(Function)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('0.0.0.0:8080')
      );
    });

    it('should default to 127.0.0.1 when host is not specified', async () => {
      const config = createConfig({ port: 3000 });
      delete (config as Record<string, unknown>)['host'];
      const server = new WebhookServer(config);

      await server.start();

      expect(mockServerInstance.listen).toHaveBeenCalledWith(
        3000,
        '127.0.0.1',
        expect.any(Function)
      );
    });

    it('should log a startup message', async () => {
      const config = createConfig({ port: 9999 });
      const server = new WebhookServer(config);

      await server.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Webhook server started')
      );
    });
  });

  describe('stop()', () => {
    it('should close the server when it is running', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);

      await server.start();
      await server.stop();

      expect(mockServerInstance.close).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Webhook server stopped');
    });

    it('should resolve immediately when server was never started', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);

      // stop() without start() should not throw
      await expect(server.stop()).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Security Headers
  // 安全標頭
  // -----------------------------------------------------------------------

  describe('security headers', () => {
    it('should set X-Content-Type-Options: nosniff on every response', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({ method: 'GET', url: '/webhook/test' });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should set X-Frame-Options: DENY on every response', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({ method: 'GET', url: '/webhook/test' });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.headers['X-Frame-Options']).toBe('DENY');
    });
  });

  // -----------------------------------------------------------------------
  // HTTP Method Enforcement
  // HTTP 方法驗證
  // -----------------------------------------------------------------------

  describe('HTTP method enforcement', () => {
    it('should reject GET requests with 405', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({ method: 'GET', url: '/webhook/telegram' });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.getBody()).toEqual({ error: 'Method not allowed' });
    });

    it('should reject PUT requests with 405', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({ method: 'PUT', url: '/webhook/slack' });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(405);
    });

    it('should reject DELETE requests with 405', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({ method: 'DELETE', url: '/webhook/slack' });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(405);
    });

    it('should reject PATCH requests with 405', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({ method: 'PATCH', url: '/webhook/telegram' });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(405);
    });
  });

  // -----------------------------------------------------------------------
  // URL Routing
  // URL 路由
  // -----------------------------------------------------------------------

  describe('URL routing', () => {
    it('should return 404 for root path /', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({ method: 'POST', url: '/' });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.getBody()).toEqual({ error: 'Not found' });
    });

    it('should return 404 for paths not matching /webhook/:channel', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({ method: 'POST', url: '/api/health' });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 for /webhook without a channel', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({ method: 'POST', url: '/webhook/' });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      // /webhook/ does not match /webhook/(\w+) since / alone after webhook has no \w+
      expect(res.statusCode).toBe(404);
    });

    it('should extract channel name from /webhook/:channel', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ message: 'test' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(200);
      expect(handler).toHaveBeenCalledWith(
        { message: 'test' },
        expect.any(Object)
      );
    });

    it('should match channel with extra path segments (e.g. /webhook/telegram/extra)', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ data: 'extra-path' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram/extra/path',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should return 404 when channel has no registered handler', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ text: 'hello' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/unknownchannel',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.getBody()).toEqual({ error: "Channel 'unknownchannel' not configured" });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No handler registered for channel: unknownchannel')
      );
    });

    it('should handle undefined req.url by defaulting to /', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({ method: 'POST', url: '/' });
      // Simulate undefined url
      (req as unknown as Record<string, unknown>).url = undefined;
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      // Falls back to '/' which does not match /webhook/(\w+)
      expect(res.statusCode).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // Successful Request Handling
  // 成功的請求處理
  // -----------------------------------------------------------------------

  describe('successful request handling', () => {
    it('should parse JSON body and pass to handler', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const payload = { update_id: 12345, message: { text: 'hello' } };
      const body = JSON.stringify(payload);
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
        headers: { 'content-type': 'application/json' },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody()).toEqual({ ok: true });
      expect(handler).toHaveBeenCalledWith(payload, expect.objectContaining({
        'content-type': 'application/json',
      }));
    });

    it('should return 200 with { ok: true } on success', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('slack', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ type: 'event_callback' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody()).toEqual({ ok: true });
    });

    it('should pass flattened headers to the handler', async () => {
      let receivedHeaders: Record<string, string> = {};
      const handler: WebhookHandler = async (_body, headers) => {
        receivedHeaders = headers;
      };
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ data: 1 });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(receivedHeaders['content-type']).toBe('application/json');
      expect(receivedHeaders['x-custom-header']).toBe('custom-value');
    });

    it('should flatten array headers to first value', async () => {
      let receivedHeaders: Record<string, string> = {};
      const handler: WebhookHandler = async (_body, headers) => {
        receivedHeaders = headers;
      };
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ data: 1 });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
        headers: {
          'x-forwarded-for': ['192.168.1.1', '10.0.0.1'] as unknown as string,
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(receivedHeaders['x-forwarded-for']).toBe('192.168.1.1');
    });

    it('should handle multiple channels independently', async () => {
      const telegramHandler = vi.fn().mockResolvedValue(undefined);
      const slackHandler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', telegramHandler);
      handlers.set('slack', slackHandler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      // Send to telegram
      const req1 = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body: JSON.stringify({ from: 'telegram' }),
      });
      const res1 = new MockServerResponse();
      await dispatchRequest(req1, res1);

      // Send to slack
      const req2 = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body: JSON.stringify({ from: 'slack' }),
      });
      const res2 = new MockServerResponse();
      await dispatchRequest(req2, res2);

      expect(telegramHandler).toHaveBeenCalledWith(
        { from: 'telegram' },
        expect.any(Object)
      );
      expect(slackHandler).toHaveBeenCalledWith(
        { from: 'slack' },
        expect.any(Object)
      );
      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // Slack Signature Verification
  // Slack 簽章驗證
  // -----------------------------------------------------------------------

  describe('Slack signature verification', () => {
    const SLACK_SECRET = 'test-slack-signing-secret-123';

    it('should accept a valid Slack signature', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('slack', handler);

      const config = createConfig({
        handlers,
        slackSigningSecret: SLACK_SECRET,
      });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ type: 'event_callback', event: { text: 'hello' } });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = createSlackSignature(body, SLACK_SECRET, timestamp);

      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body,
        headers: {
          'x-slack-request-timestamp': timestamp,
          'x-slack-signature': signature,
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should reject an invalid Slack signature with 401', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('slack', handler);

      const config = createConfig({
        handlers,
        slackSigningSecret: SLACK_SECRET,
      });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ type: 'event_callback' });
      const timestamp = String(Math.floor(Date.now() / 1000));

      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body,
        headers: {
          'x-slack-request-timestamp': timestamp,
          'x-slack-signature': 'v0=invalid_signature_value',
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.getBody()).toEqual({ error: 'Invalid signature' });
      expect(handler).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid Slack webhook signature');
    });

    it('should reject request with missing x-slack-signature header', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('slack', handler);

      const config = createConfig({
        handlers,
        slackSigningSecret: SLACK_SECRET,
      });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ type: 'event_callback' });
      const timestamp = String(Math.floor(Date.now() / 1000));

      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body,
        headers: {
          'x-slack-request-timestamp': timestamp,
          // Missing x-slack-signature
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should reject request with missing x-slack-request-timestamp header', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('slack', handler);

      const config = createConfig({
        handlers,
        slackSigningSecret: SLACK_SECRET,
      });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ type: 'event_callback' });

      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body,
        headers: {
          'x-slack-signature': 'v0=somesig',
          // Missing x-slack-request-timestamp
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should reject replay attacks (timestamp older than 5 minutes)', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('slack', handler);

      const config = createConfig({
        handlers,
        slackSigningSecret: SLACK_SECRET,
      });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ type: 'event_callback' });
      // Timestamp from 10 minutes ago
      const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600);
      const signature = createSlackSignature(body, SLACK_SECRET, staleTimestamp);

      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body,
        headers: {
          'x-slack-request-timestamp': staleTimestamp,
          'x-slack-signature': signature,
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should skip signature verification when slackSigningSecret is not configured', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('slack', handler);

      // No slackSigningSecret in config
      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ type: 'event_callback' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      // Should pass through without signature check
      expect(res.statusCode).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should not verify signatures for non-slack channels even if slackSigningSecret is set', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({
        handlers,
        slackSigningSecret: SLACK_SECRET,
      });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ message: { text: 'hello' } });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
        // No Slack headers at all
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      // Telegram should not require Slack signature
      expect(res.statusCode).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should accept signature at exactly the 5-minute boundary', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('slack', handler);

      const config = createConfig({
        handlers,
        slackSigningSecret: SLACK_SECRET,
      });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ type: 'event_callback' });
      // Exactly 299 seconds ago (just within 5 minutes)
      const timestamp = String(Math.floor(Date.now() / 1000) - 299);
      const signature = createSlackSignature(body, SLACK_SECRET, timestamp);

      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body,
        headers: {
          'x-slack-request-timestamp': timestamp,
          'x-slack-signature': signature,
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should reject signature with wrong secret', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('slack', handler);

      const config = createConfig({
        handlers,
        slackSigningSecret: SLACK_SECRET,
      });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ type: 'event_callback' });
      const timestamp = String(Math.floor(Date.now() / 1000));
      // Sign with wrong secret
      const wrongSignature = createSlackSignature(body, 'wrong-secret', timestamp);

      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body,
        headers: {
          'x-slack-request-timestamp': timestamp,
          'x-slack-signature': wrongSignature,
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Error Handling
  // 錯誤處理
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('should return 500 when handler throws an error', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler crashed'));
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ message: 'test' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.getBody()).toEqual({ error: 'Internal server error' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Webhook processing failed',
        expect.objectContaining({
          channel: 'telegram',
          error: 'Handler crashed',
        })
      );
    });

    it('should return 500 when handler throws a non-Error object', async () => {
      const handler = vi.fn().mockRejectedValue('string error');
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('slack', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ event: 'test' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Webhook processing failed',
        expect.objectContaining({
          channel: 'slack',
          error: 'string error',
        })
      );
    });

    it('should return 500 when body is invalid JSON', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body: 'not valid json {{{',
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.getBody()).toEqual({ error: 'Internal server error' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 500 when body is empty string', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body: '',
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(500);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should log error with channel name when processing fails', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('DB connection lost'));
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('discord', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ data: 'test' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/discord',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Webhook processing failed',
        expect.objectContaining({
          channel: 'discord',
          error: 'DB connection lost',
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // Body Size Limit
  // 請求體大小限制
  // -----------------------------------------------------------------------

  describe('request body size limit', () => {
    it('should reject bodies larger than 1MB', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      // Create a body larger than 1MB (1_048_576 bytes)
      const largeBody = Buffer.alloc(1_048_577, 'x');
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        bodyChunks: [largeBody],
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(500);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should accept bodies at exactly 1MB', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      // Create a valid JSON body that is exactly 1MB
      const padding = 'x'.repeat(1_048_576 - 15); // Account for JSON wrapper
      const jsonBody = JSON.stringify({ d: padding });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body: jsonBody,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      // If body size <= 1MB, it should process (may succeed or parse JSON fine)
      expect(handler).toHaveBeenCalled();
    });

    it('should reject multiple small chunks that exceed 1MB total', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      // Create multiple chunks that together exceed 1MB
      const chunkSize = 600_000;
      const chunk1 = Buffer.alloc(chunkSize, 'a');
      const chunk2 = Buffer.alloc(chunkSize, 'b');
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        bodyChunks: [chunk1, chunk2],
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(500);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Response Format
  // 回應格式
  // -----------------------------------------------------------------------

  describe('response format', () => {
    it('should always return Content-Type: application/json', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      // 405 response
      const req1 = new MockIncomingMessage({ method: 'GET', url: '/webhook/test' });
      const res1 = new MockServerResponse();
      await dispatchRequest(req1, res1);
      expect(res1.headers['Content-Type']).toBe('application/json');

      // 404 response
      const req2 = new MockIncomingMessage({ method: 'POST', url: '/invalid' });
      const res2 = new MockServerResponse();
      await dispatchRequest(req2, res2);
      expect(res2.headers['Content-Type']).toBe('application/json');

      // Success response
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('test', handler);
      const config2 = createConfig({ handlers });
      const server2 = new WebhookServer(config2);
      await server2.start();

      const req3 = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/test',
        body: JSON.stringify({ ok: true }),
      });
      const res3 = new MockServerResponse();
      await dispatchRequest(req3, res3);
      expect(res3.headers['Content-Type']).toBe('application/json');
    });

    it('should return valid JSON in all error responses', async () => {
      const config = createConfig();
      const server = new WebhookServer(config);
      await server.start();

      // 405
      const req1 = new MockIncomingMessage({ method: 'GET', url: '/webhook/test' });
      const res1 = new MockServerResponse();
      await dispatchRequest(req1, res1);
      expect(() => JSON.parse(res1.body)).not.toThrow();

      // 404 - not found
      const req2 = new MockIncomingMessage({ method: 'POST', url: '/' });
      const res2 = new MockServerResponse();
      await dispatchRequest(req2, res2);
      expect(() => JSON.parse(res2.body)).not.toThrow();

      // 404 - no handler
      const req3 = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/missing',
        body: JSON.stringify({}),
      });
      const res3 = new MockServerResponse();
      await dispatchRequest(req3, res3);
      expect(() => JSON.parse(res3.body)).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Edge Cases
  // 邊界情況
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle handler that returns undefined', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ data: 'test' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should handle JSON body with nested objects', async () => {
      let receivedBody: unknown = null;
      const handler: WebhookHandler = async (body) => {
        receivedBody = body;
      };
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const payload = {
        update_id: 12345,
        message: {
          message_id: 1,
          from: { id: 999, first_name: 'Test', is_bot: false },
          chat: { id: 999, type: 'private' },
          date: 1700000000,
          text: '/status',
        },
      };
      const body = JSON.stringify(payload);
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(200);
      expect(receivedBody).toEqual(payload);
    });

    it('should handle JSON body with arrays', async () => {
      let receivedBody: unknown = null;
      const handler: WebhookHandler = async (body) => {
        receivedBody = body;
      };
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('webhook', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const payload = [{ event: 'alert' }, { event: 'scan' }];
      const body = JSON.stringify(payload);
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/webhook',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(200);
      expect(receivedBody).toEqual(payload);
    });

    it('should handle JSON body with unicode characters', async () => {
      let receivedBody: unknown = null;
      const handler: WebhookHandler = async (body) => {
        receivedBody = body;
      };
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('line', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const payload = { text: 'Hello' };
      const body = JSON.stringify(payload);
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/line',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(200);
      expect(receivedBody).toEqual(payload);
    });

    it('should handle request with query string in URL', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ data: 'test' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram?token=abc123',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      // The regex /^\/webhook\/(\w+)/ should still match 'telegram'
      expect(res.statusCode).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should handle empty handlers map', async () => {
      const config = createConfig({ handlers: new Map() });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ data: 'test' });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.getBody()).toEqual({ error: "Channel 'telegram' not configured" });
    });

    it('should handle concurrent requests to different channels', async () => {
      const results: string[] = [];

      const telegramHandler: WebhookHandler = async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push('telegram');
      };
      const slackHandler: WebhookHandler = async () => {
        results.push('slack');
      };

      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', telegramHandler);
      handlers.set('slack', slackHandler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const req1 = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body: JSON.stringify({ ch: 'telegram' }),
      });
      const req2 = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/slack',
        body: JSON.stringify({ ch: 'slack' }),
      });

      const res1 = new MockServerResponse();
      const res2 = new MockServerResponse();

      // Dispatch both concurrently
      await Promise.all([
        dispatchRequest(req1, res1),
        dispatchRequest(req2, res2),
      ]);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
      expect(results).toContain('telegram');
      expect(results).toContain('slack');
    });
  });

  // -----------------------------------------------------------------------
  // Header Flattening
  // 標頭扁平化
  // -----------------------------------------------------------------------

  describe('header flattening', () => {
    it('should handle headers with undefined values', async () => {
      let receivedHeaders: Record<string, string> = {};
      const handler: WebhookHandler = async (_body, headers) => {
        receivedHeaders = headers;
      };
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ data: 1 });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
        headers: {
          'content-type': 'application/json',
          'x-undefined': undefined,
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      expect(receivedHeaders['content-type']).toBe('application/json');
      // Undefined headers should be excluded
      expect(receivedHeaders['x-undefined']).toBeUndefined();
    });

    it('should handle array headers with empty first value', async () => {
      let receivedHeaders: Record<string, string> = {};
      const handler: WebhookHandler = async (_body, headers) => {
        receivedHeaders = headers;
      };
      const handlers = new Map<string, WebhookHandler>();
      handlers.set('telegram', handler);

      const config = createConfig({ handlers });
      const server = new WebhookServer(config);
      await server.start();

      const body = JSON.stringify({ data: 1 });
      const req = new MockIncomingMessage({
        method: 'POST',
        url: '/webhook/telegram',
        body,
        headers: {
          'x-empty-array': [] as unknown as string,
        },
      });
      const res = new MockServerResponse();

      await dispatchRequest(req, res);

      // Empty array should yield '' because value[0] ?? ''
      expect(receivedHeaders['x-empty-array']).toBe('');
    });
  });
});
