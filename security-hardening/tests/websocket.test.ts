import { describe, it, expect, beforeEach } from 'vitest';
import { validateOrigin, createOriginValidator } from '../src/websocket/origin-validator.js';
import { CsrfTokenManager } from '../src/websocket/csrf-token.js';
import { validateGatewayUrl, sanitizeWebSocketUrl } from '../src/websocket/connection-validator.js';

describe('Origin Validator', () => {
  it('should reject missing Origin header', () => {
    expect(validateOrigin(undefined)).toBe(false);
  });

  it('should reject unauthorized Origin', () => {
    expect(validateOrigin('https://evil.com')).toBe(false);
    expect(validateOrigin('https://attacker.example.com')).toBe(false);
  });

  it('should allow localhost Origin', () => {
    expect(validateOrigin('http://localhost:18789')).toBe(true);
    expect(validateOrigin('http://127.0.0.1:3000')).toBe(true);
    expect(validateOrigin('http://localhost:8080')).toBe(true);
  });

  it('should allow explicitly whitelisted Origins', () => {
    const config = {
      allowedOrigins: ['https://my-dashboard.example.com'],
      allowLocalhost: false,
    };
    expect(validateOrigin('https://my-dashboard.example.com', config)).toBe(true);
    expect(validateOrigin('http://localhost:18789', config)).toBe(false);
  });

  it('should reject when localhost is disabled', () => {
    const config = { allowedOrigins: [], allowLocalhost: false };
    expect(validateOrigin('http://localhost:18789', config)).toBe(false);
  });

  it('should work as middleware via createOriginValidator', () => {
    const validator = createOriginValidator({ allowLocalhost: true });
    expect(validator({ origin: 'http://localhost:3000' })).toBe(true);
    expect(validator({ origin: 'https://evil.com' })).toBe(false);
    expect(validator({ origin: undefined })).toBe(false);
  });
});

describe('CSRF Token Manager', () => {
  let manager: CsrfTokenManager;

  beforeEach(() => {
    manager = new CsrfTokenManager(1000); // 1 second expiry for testing
  });

  it('should generate valid CSRF tokens', () => {
    const token = manager.generate('session-1');
    expect(token.token).toBeTruthy();
    expect(token.token.length).toBeGreaterThan(20);
    expect(token.sessionId).toBe('session-1');
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should validate correct tokens', () => {
    const token = manager.generate('session-1');
    expect(manager.validate(token.token, 'session-1')).toBe(true);
  });

  it('should reject token with wrong session ID', () => {
    const token = manager.generate('session-1');
    expect(manager.validate(token.token, 'session-2')).toBe(false);
  });

  it('should reject non-existent tokens', () => {
    expect(manager.validate('non-existent-token', 'session-1')).toBe(false);
  });

  it('should reject expired tokens', async () => {
    const manager2 = new CsrfTokenManager(1); // 1ms expiry
    const token = manager2.generate('session-1');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(manager2.validate(token.token, 'session-1')).toBe(false);
  });

  it('should revoke tokens', () => {
    const token = manager.generate('session-1');
    manager.revoke(token.token);
    expect(manager.validate(token.token, 'session-1')).toBe(false);
  });

  it('should cleanup expired tokens', async () => {
    const manager2 = new CsrfTokenManager(1); // 1ms expiry
    manager2.generate('s1');
    manager2.generate('s2');
    await new Promise((resolve) => setTimeout(resolve, 10));
    const cleaned = manager2.cleanup();
    expect(cleaned).toBe(2);
    expect(manager2.size).toBe(0);
  });
});

describe('Connection Validator', () => {
  it('should allow when no gatewayUrl provided', async () => {
    expect(await validateGatewayUrl(undefined)).toBe(true);
  });

  it('should allow localhost gatewayUrl', async () => {
    expect(await validateGatewayUrl('http://localhost:18789')).toBe(true);
    expect(await validateGatewayUrl('http://127.0.0.1:3000')).toBe(true);
  });

  it('should block external gatewayUrl without confirmation', async () => {
    expect(await validateGatewayUrl('https://evil.com/gateway')).toBe(false);
  });

  it('should block invalid URL format', async () => {
    expect(await validateGatewayUrl('not-a-valid-url')).toBe(false);
  });

  it('should allow external URL when user confirms', async () => {
    const confirm = async (_url: string): Promise<boolean> => true;
    expect(await validateGatewayUrl('https://trusted.com/gw', confirm)).toBe(true);
  });

  it('should block external URL when user rejects', async () => {
    const confirm = async (_url: string): Promise<boolean> => false;
    expect(await validateGatewayUrl('https://trusted.com/gw', confirm)).toBe(false);
  });
});

describe('WebSocket URL Sanitizer', () => {
  it('should sanitize valid ws:// URLs', () => {
    expect(sanitizeWebSocketUrl('ws://localhost:18789/path')).toBe('ws://localhost:18789/path');
  });

  it('should sanitize valid wss:// URLs', () => {
    expect(sanitizeWebSocketUrl('wss://secure.example.com/')).toBe('wss://secure.example.com/');
  });

  it('should reject non-WebSocket protocols', () => {
    expect(sanitizeWebSocketUrl('http://localhost:18789')).toBeNull();
    expect(sanitizeWebSocketUrl('ftp://files.example.com')).toBeNull();
  });

  it('should reject invalid URLs', () => {
    expect(sanitizeWebSocketUrl('not-a-url')).toBeNull();
  });

  it('should strip credentials from URLs', () => {
    const result = sanitizeWebSocketUrl('ws://user:pass@localhost:18789/path');
    expect(result).toBe('ws://localhost:18789/path');
    expect(result).not.toContain('user');
    expect(result).not.toContain('pass');
  });
});
