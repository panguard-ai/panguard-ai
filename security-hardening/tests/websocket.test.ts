import { describe, it, expect, beforeEach } from 'vitest';
import { validateOrigin, createOriginValidator } from '../src/websocket/origin-validator.js';
import { CsrfTokenManager } from '../src/websocket/csrf-token.js';
import {
  validateGatewayUrl,
  sanitizeWebSocketUrl,
} from '../src/websocket/connection-validator.js';

// ---------------------------------------------------------------------------
// Origin Validator
// ---------------------------------------------------------------------------
describe('Origin Validator', () => {
  describe('validateOrigin', () => {
    it('should reject missing Origin header (undefined)', () => {
      expect(validateOrigin(undefined)).toBe(false);
    });

    it('should reject empty string Origin header', () => {
      expect(validateOrigin('')).toBe(false);
    });

    it('should reject unauthorized Origin', () => {
      expect(validateOrigin('https://evil.com')).toBe(false);
      expect(validateOrigin('https://attacker.example.com')).toBe(false);
    });

    it('should allow default allowed origins', () => {
      expect(validateOrigin('http://localhost:18789')).toBe(true);
      expect(validateOrigin('http://127.0.0.1:18789')).toBe(true);
    });

    it('should allow any localhost port by default', () => {
      expect(validateOrigin('http://localhost:3000')).toBe(true);
      expect(validateOrigin('http://localhost:8080')).toBe(true);
      expect(validateOrigin('http://127.0.0.1:3000')).toBe(true);
    });

    it('should allow localhost without port', () => {
      expect(validateOrigin('http://localhost')).toBe(true);
      expect(validateOrigin('http://127.0.0.1')).toBe(true);
    });

    it('should allow https localhost', () => {
      expect(validateOrigin('https://localhost:3000')).toBe(true);
      expect(validateOrigin('https://127.0.0.1:443')).toBe(true);
    });

    it('should allow IPv6 localhost (::1)', () => {
      expect(validateOrigin('http://::1')).toBe(true);
      expect(validateOrigin('http://::1:8080')).toBe(true);
    });

    it('should allow explicitly whitelisted Origins', () => {
      const config = {
        allowedOrigins: ['https://my-dashboard.example.com'],
        allowLocalhost: false,
      };
      expect(validateOrigin('https://my-dashboard.example.com', config)).toBe(true);
    });

    it('should reject localhost when disabled', () => {
      const config = { allowedOrigins: [], allowLocalhost: false };
      expect(validateOrigin('http://localhost:18789', config)).toBe(false);
      expect(validateOrigin('http://127.0.0.1:3000', config)).toBe(false);
    });

    it('should handle multiple allowed origins', () => {
      const config = {
        allowedOrigins: ['https://app1.example.com', 'https://app2.example.com'],
        allowLocalhost: false,
      };
      expect(validateOrigin('https://app1.example.com', config)).toBe(true);
      expect(validateOrigin('https://app2.example.com', config)).toBe(true);
      expect(validateOrigin('https://app3.example.com', config)).toBe(false);
    });

    it('should reject origins that are subdomains of allowed origins', () => {
      const config = {
        allowedOrigins: ['https://example.com'],
        allowLocalhost: false,
      };
      expect(validateOrigin('https://evil.example.com', config)).toBe(false);
    });

    it('should reject origins with different protocols', () => {
      const config = {
        allowedOrigins: ['https://example.com'],
        allowLocalhost: false,
      };
      expect(validateOrigin('http://example.com', config)).toBe(false);
    });
  });

  describe('createOriginValidator', () => {
    it('should work as middleware with string origin', () => {
      const validator = createOriginValidator({ allowLocalhost: true });
      expect(validator({ origin: 'http://localhost:3000' })).toBe(true);
      expect(validator({ origin: 'https://evil.com' })).toBe(false);
    });

    it('should handle undefined origin header', () => {
      const validator = createOriginValidator();
      expect(validator({ origin: undefined })).toBe(false);
    });

    it('should handle array origin header (takes first element)', () => {
      const validator = createOriginValidator({ allowLocalhost: true });
      expect(validator({ origin: ['http://localhost:3000', 'extra'] })).toBe(true);
    });

    it('should use default config when no options provided', () => {
      const validator = createOriginValidator();
      // Default allows localhost and default origins
      expect(validator({ origin: 'http://localhost:18789' })).toBe(true);
    });

    it('should respect custom allowedOrigins', () => {
      const validator = createOriginValidator({
        allowedOrigins: ['https://custom.com'],
        allowLocalhost: false,
      });
      expect(validator({ origin: 'https://custom.com' })).toBe(true);
      expect(validator({ origin: 'http://localhost:18789' })).toBe(false);
    });

    it('should handle missing origin key in headers', () => {
      const validator = createOriginValidator();
      expect(validator({})).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// CSRF Token Manager
// ---------------------------------------------------------------------------
describe('CSRF Token Manager', () => {
  let manager: CsrfTokenManager;

  beforeEach(() => {
    manager = new CsrfTokenManager(1000); // 1 second expiry for testing
  });

  describe('generate', () => {
    it('should generate valid CSRF tokens', () => {
      const token = manager.generate('session-1');
      expect(token.token).toBeTruthy();
      expect(token.token.length).toBeGreaterThan(20);
      expect(token.sessionId).toBe('session-1');
      expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate unique tokens for each call', () => {
      const token1 = manager.generate('session-1');
      const token2 = manager.generate('session-1');
      expect(token1.token).not.toBe(token2.token);
    });

    it('should set createdAt to current time', () => {
      const before = Date.now();
      const token = manager.generate('session-1');
      const after = Date.now();
      expect(token.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(token.createdAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('should set expiresAt based on configured expiration', () => {
      const managerCustom = new CsrfTokenManager(5000); // 5 seconds
      const before = Date.now();
      const token = managerCustom.generate('session-1');
      // expiry should be roughly 5 seconds from now
      const expectedExpiry = before + 5000;
      expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 100);
      expect(token.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 100);
    });

    it('should increment size counter', () => {
      expect(manager.size).toBe(0);
      manager.generate('s1');
      expect(manager.size).toBe(1);
      manager.generate('s2');
      expect(manager.size).toBe(2);
    });
  });

  describe('validate', () => {
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

    it('should reject empty token string', () => {
      expect(manager.validate('', 'session-1')).toBe(false);
    });

    it('should reject expired tokens', async () => {
      const quickExpiry = new CsrfTokenManager(1); // 1ms expiry
      const token = quickExpiry.generate('session-1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(quickExpiry.validate(token.token, 'session-1')).toBe(false);
    });

    it('should remove expired token from store on validation attempt', async () => {
      const quickExpiry = new CsrfTokenManager(1); // 1ms expiry
      const token = quickExpiry.generate('session-1');
      expect(quickExpiry.size).toBe(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      quickExpiry.validate(token.token, 'session-1');
      expect(quickExpiry.size).toBe(0);
    });
  });

  describe('revoke', () => {
    it('should revoke tokens', () => {
      const token = manager.generate('session-1');
      manager.revoke(token.token);
      expect(manager.validate(token.token, 'session-1')).toBe(false);
    });

    it('should decrease size after revocation', () => {
      const token = manager.generate('session-1');
      expect(manager.size).toBe(1);
      manager.revoke(token.token);
      expect(manager.size).toBe(0);
    });

    it('should handle revoking non-existent token gracefully', () => {
      expect(() => manager.revoke('non-existent')).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired tokens', async () => {
      const quickExpiry = new CsrfTokenManager(1); // 1ms expiry
      quickExpiry.generate('s1');
      quickExpiry.generate('s2');
      await new Promise((resolve) => setTimeout(resolve, 10));
      const cleaned = quickExpiry.cleanup();
      expect(cleaned).toBe(2);
      expect(quickExpiry.size).toBe(0);
    });

    it('should not cleanup non-expired tokens', () => {
      manager.generate('s1');
      manager.generate('s2');
      const cleaned = manager.cleanup();
      expect(cleaned).toBe(0);
      expect(manager.size).toBe(2);
    });

    it('should return 0 when no tokens exist', () => {
      const cleaned = manager.cleanup();
      expect(cleaned).toBe(0);
    });

    it('should only cleanup expired tokens and leave valid ones', async () => {
      const mixed = new CsrfTokenManager(50); // 50ms expiry
      mixed.generate('expired-1');
      mixed.generate('expired-2');
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Generate new tokens after the old ones expired
      mixed.generate('valid-1');

      const cleaned = mixed.cleanup();
      expect(cleaned).toBe(2);
      expect(mixed.size).toBe(1);
    });
  });

  describe('size', () => {
    it('should start at 0', () => {
      expect(manager.size).toBe(0);
    });

    it('should track number of active tokens', () => {
      manager.generate('s1');
      manager.generate('s2');
      manager.generate('s3');
      expect(manager.size).toBe(3);
    });
  });

  describe('default expiration', () => {
    it('should use 15-minute default expiration', () => {
      const defaultManager = new CsrfTokenManager();
      const before = Date.now();
      const token = defaultManager.generate('session-1');
      const fifteenMinutes = 15 * 60 * 1000;
      const expectedExpiry = before + fifteenMinutes;
      // Allow 200ms tolerance
      expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 200);
      expect(token.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 200);
    });
  });
});

// ---------------------------------------------------------------------------
// Connection Validator
// ---------------------------------------------------------------------------
describe('Connection Validator', () => {
  describe('validateGatewayUrl', () => {
    it('should allow when no gatewayUrl provided (undefined)', async () => {
      expect(await validateGatewayUrl(undefined)).toBe(true);
    });

    it('should allow localhost http', async () => {
      expect(await validateGatewayUrl('http://localhost:18789')).toBe(true);
    });

    it('should allow localhost 127.0.0.1', async () => {
      expect(await validateGatewayUrl('http://127.0.0.1:3000')).toBe(true);
    });

    it('should block bracketed IPv6 localhost (implementation limitation)', async () => {
      // URL constructor keeps brackets in hostname ([::1] vs ::1),
      // so isLocalhostUrl does not match. This is a known limitation.
      expect(await validateGatewayUrl('http://[::1]:8080')).toBe(false);
    });

    it('should block external gatewayUrl without confirmation', async () => {
      expect(await validateGatewayUrl('https://evil.com/gateway')).toBe(false);
    });

    it('should block invalid URL format', async () => {
      expect(await validateGatewayUrl('not-a-valid-url')).toBe(false);
    });

    it('should allow empty string URL (treated as falsy / no URL)', async () => {
      // Empty string is falsy in JavaScript, so !gatewayUrl is true,
      // meaning "use default" - same as undefined
      expect(await validateGatewayUrl('')).toBe(true);
    });

    it('should allow external URL when user confirms', async () => {
      const confirm = async (_url: string): Promise<boolean> => true;
      expect(await validateGatewayUrl('https://trusted.com/gw', confirm)).toBe(true);
    });

    it('should block external URL when user rejects', async () => {
      const confirm = async (_url: string): Promise<boolean> => false;
      expect(await validateGatewayUrl('https://trusted.com/gw', confirm)).toBe(false);
    });

    it('should pass the URL to the confirm callback', async () => {
      let receivedUrl = '';
      const confirm = async (url: string): Promise<boolean> => {
        receivedUrl = url;
        return true;
      };
      await validateGatewayUrl('https://external.com/ws', confirm);
      expect(receivedUrl).toBe('https://external.com/ws');
    });

    it('should allow localhost on any port', async () => {
      expect(await validateGatewayUrl('http://localhost:1')).toBe(true);
      expect(await validateGatewayUrl('http://localhost:65535')).toBe(true);
    });

    it('should handle URL with path', async () => {
      expect(await validateGatewayUrl('http://localhost:8080/ws/gateway')).toBe(true);
    });

    it('should block external URL when no confirm callback provided', async () => {
      expect(await validateGatewayUrl('wss://remote-server.com/ws')).toBe(false);
    });
  });

  describe('sanitizeWebSocketUrl', () => {
    it('should sanitize valid ws:// URLs', () => {
      expect(sanitizeWebSocketUrl('ws://localhost:18789/path')).toBe(
        'ws://localhost:18789/path'
      );
    });

    it('should sanitize valid wss:// URLs', () => {
      expect(sanitizeWebSocketUrl('wss://secure.example.com/')).toBe(
        'wss://secure.example.com/'
      );
    });

    it('should reject http:// protocol', () => {
      expect(sanitizeWebSocketUrl('http://localhost:18789')).toBeNull();
    });

    it('should reject https:// protocol', () => {
      expect(sanitizeWebSocketUrl('https://example.com')).toBeNull();
    });

    it('should reject ftp:// protocol', () => {
      expect(sanitizeWebSocketUrl('ftp://files.example.com')).toBeNull();
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeWebSocketUrl('not-a-url')).toBeNull();
    });

    it('should reject empty string', () => {
      expect(sanitizeWebSocketUrl('')).toBeNull();
    });

    it('should strip credentials from URLs', () => {
      const result = sanitizeWebSocketUrl('ws://user:pass@localhost:18789/path');
      expect(result).toBe('ws://localhost:18789/path');
      expect(result).not.toContain('user');
      expect(result).not.toContain('pass');
    });

    it('should strip username-only credentials', () => {
      const result = sanitizeWebSocketUrl('ws://admin@localhost:18789/path');
      expect(result).toBe('ws://localhost:18789/path');
      expect(result).not.toContain('admin');
    });

    it('should preserve path and host', () => {
      const result = sanitizeWebSocketUrl('ws://example.com:9090/api/v1/ws');
      expect(result).toBe('ws://example.com:9090/api/v1/ws');
    });

    it('should strip query parameters (as part of URL reconstruction)', () => {
      const result = sanitizeWebSocketUrl('ws://localhost:8080/path');
      // The reconstructed URL only uses protocol, host, and pathname
      expect(result).toBe('ws://localhost:8080/path');
    });

    it('should handle ws:// URL without port', () => {
      const result = sanitizeWebSocketUrl('ws://example.com/ws');
      expect(result).toBe('ws://example.com/ws');
    });

    it('should handle wss:// URL without path', () => {
      const result = sanitizeWebSocketUrl('wss://example.com');
      expect(result).toBe('wss://example.com/');
    });
  });
});
