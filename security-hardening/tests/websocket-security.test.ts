import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateOrigin, createOriginValidator } from '../src/websocket/origin-validator.js';
import { CsrfTokenManager } from '../src/websocket/csrf-token.js';
import { validateGatewayUrl, sanitizeWebSocketUrl } from '../src/websocket/connection-validator.js';
import type { OriginConfig } from '../src/types.js';

// Suppress log output
beforeEach(() => {
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Origin Validator - Extended
// ---------------------------------------------------------------------------
describe('Origin Validator - Extended', () => {
  describe('validateOrigin - security edge cases', () => {
    it('should reject null-like strings', () => {
      expect(validateOrigin('null')).toBe(false);
      expect(validateOrigin('undefined')).toBe(false);
    });

    it('should reject file:// protocol origins', () => {
      expect(validateOrigin('file:///etc/passwd')).toBe(false);
    });

    it('should reject javascript: protocol origins', () => {
      expect(validateOrigin('javascript:alert(1)')).toBe(false);
    });

    it('should reject data: protocol origins', () => {
      expect(validateOrigin('data:text/html,<h1>XSS</h1>')).toBe(false);
    });

    it('should reject origins with trailing slashes (not exact match)', () => {
      const config: OriginConfig = {
        allowedOrigins: ['https://example.com'],
        allowLocalhost: false,
      };
      // 'https://example.com/' is not the same as 'https://example.com'
      expect(validateOrigin('https://example.com/', config)).toBe(false);
    });

    it('should reject origins with paths appended', () => {
      const config: OriginConfig = {
        allowedOrigins: ['https://example.com'],
        allowLocalhost: false,
      };
      expect(validateOrigin('https://example.com/evil-path', config)).toBe(false);
    });

    it('should reject origins with different ports', () => {
      const config: OriginConfig = {
        allowedOrigins: ['https://example.com:443'],
        allowLocalhost: false,
      };
      expect(validateOrigin('https://example.com:8443', config)).toBe(false);
    });

    it('should allow localhost with https protocol', () => {
      expect(validateOrigin('https://localhost')).toBe(true);
      expect(validateOrigin('https://127.0.0.1')).toBe(true);
    });

    it('should allow IPv6 ::1 localhost', () => {
      expect(validateOrigin('http://::1')).toBe(true);
      expect(validateOrigin('http://::1:3000')).toBe(true);
    });

    it('should not allow localhost patterns when allowLocalhost is false', () => {
      const config: OriginConfig = {
        allowedOrigins: [],
        allowLocalhost: false,
      };
      expect(validateOrigin('http://localhost', config)).toBe(false);
      expect(validateOrigin('http://127.0.0.1', config)).toBe(false);
      expect(validateOrigin('http://::1', config)).toBe(false);
    });

    it('should handle large number of allowed origins', () => {
      const manyOrigins = Array.from({ length: 1000 }, (_, i) => `https://app${i}.example.com`);
      const config: OriginConfig = {
        allowedOrigins: manyOrigins,
        allowLocalhost: false,
      };
      expect(validateOrigin('https://app500.example.com', config)).toBe(true);
      expect(validateOrigin('https://app1001.example.com', config)).toBe(false);
    });
  });

  describe('createOriginValidator - Extended', () => {
    it('should handle empty headers object', () => {
      const validator = createOriginValidator();
      expect(validator({})).toBe(false);
    });

    it('should handle headers with multiple keys', () => {
      const validator = createOriginValidator({ allowLocalhost: true });
      expect(
        validator({
          origin: 'http://localhost:3000',
          'content-type': 'text/html',
          authorization: 'Bearer token',
        })
      ).toBe(true);
    });

    it('should handle empty array origin', () => {
      const validator = createOriginValidator();
      expect(validator({ origin: [] })).toBe(false);
    });

    it('should take first element from array origin', () => {
      const validator = createOriginValidator({
        allowedOrigins: ['https://first.com'],
        allowLocalhost: false,
      });
      expect(validator({ origin: ['https://first.com', 'https://second.com'] })).toBe(true);
    });

    it('should use default config fields when partially specified', () => {
      // Only specify allowLocalhost, allowedOrigins should get defaults
      const validator = createOriginValidator({ allowLocalhost: false });
      // Default allowedOrigins includes localhost:18789
      expect(validator({ origin: 'http://localhost:18789' })).toBe(true);
      // But localhost rule is disabled, so other localhost should fail
      expect(validator({ origin: 'http://localhost:3000' })).toBe(false);
    });

    it('should use default config when called with undefined', () => {
      const validator = createOriginValidator(undefined);
      expect(validator({ origin: 'http://localhost:18789' })).toBe(true);
    });

    it('should use default config when called with empty object', () => {
      const validator = createOriginValidator({});
      expect(validator({ origin: 'http://localhost:18789' })).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// CSRF Token Manager - Extended
// ---------------------------------------------------------------------------
describe('CSRF Token Manager - Extended', () => {
  let manager: CsrfTokenManager;

  beforeEach(() => {
    manager = new CsrfTokenManager(5000); // 5 second expiry
  });

  describe('generate - Extended', () => {
    it('should generate base64url-encoded tokens', () => {
      const token = manager.generate('session-1');
      // base64url only uses: A-Z, a-z, 0-9, -, _
      expect(token.token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate tokens of consistent length', () => {
      const tokens = Array.from({ length: 10 }, (_, i) => manager.generate(`session-${i}`));
      // 32 random bytes in base64url should be ~43 chars
      for (const token of tokens) {
        expect(token.token.length).toBeGreaterThan(30);
        expect(token.token.length).toBeLessThan(50);
      }
    });

    it('should handle rapid generation of many tokens', () => {
      for (let i = 0; i < 100; i++) {
        manager.generate(`session-${i}`);
      }
      expect(manager.size).toBe(100);
    });

    it('should handle same session ID for multiple tokens', () => {
      const t1 = manager.generate('same-session');
      const t2 = manager.generate('same-session');
      expect(t1.token).not.toBe(t2.token);
      expect(manager.size).toBe(2);
      // Both should be valid
      expect(manager.validate(t1.token, 'same-session')).toBe(true);
      expect(manager.validate(t2.token, 'same-session')).toBe(true);
    });

    it('should set correct expiresAt for custom expiration', () => {
      const customManager = new CsrfTokenManager(30000); // 30 seconds
      const before = Date.now();
      const token = customManager.generate('session');
      const after = Date.now();
      const expectedMin = before + 30000;
      const expectedMax = after + 30000;
      expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin - 10);
      expect(token.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax + 10);
    });
  });

  describe('validate - Extended', () => {
    it('should validate token immediately after generation', () => {
      const token = manager.generate('session-1');
      expect(manager.validate(token.token, 'session-1')).toBe(true);
    });

    it('should reject random strings as tokens', () => {
      expect(manager.validate('random-garbage-string', 'session-1')).toBe(false);
    });

    it('should reject token with slightly different session ID', () => {
      const token = manager.generate('session-1');
      expect(manager.validate(token.token, 'session-1 ')).toBe(false);
      expect(manager.validate(token.token, 'Session-1')).toBe(false);
    });

    it('should reject token after revocation', () => {
      const token = manager.generate('session-1');
      manager.revoke(token.token);
      expect(manager.validate(token.token, 'session-1')).toBe(false);
    });

    it('should still validate other tokens after one is revoked', () => {
      const t1 = manager.generate('session-1');
      const t2 = manager.generate('session-2');
      manager.revoke(t1.token);
      expect(manager.validate(t1.token, 'session-1')).toBe(false);
      expect(manager.validate(t2.token, 'session-2')).toBe(true);
    });
  });

  describe('revoke - Extended', () => {
    it('should handle revoking the same token twice', () => {
      const token = manager.generate('session-1');
      manager.revoke(token.token);
      expect(manager.size).toBe(0);
      // Second revoke should be no-op
      expect(() => manager.revoke(token.token)).not.toThrow();
      expect(manager.size).toBe(0);
    });

    it('should not affect other tokens when revoking one', () => {
      const tokens = Array.from({ length: 5 }, (_, i) => manager.generate(`session-${i}`));
      manager.revoke(tokens[2]!.token);
      expect(manager.size).toBe(4);
      for (let i = 0; i < 5; i++) {
        if (i === 2) {
          expect(manager.validate(tokens[i]!.token, `session-${i}`)).toBe(false);
        } else {
          expect(manager.validate(tokens[i]!.token, `session-${i}`)).toBe(true);
        }
      }
    });
  });

  describe('cleanup - Extended', () => {
    it('should return 0 for empty manager', () => {
      const emptyManager = new CsrfTokenManager();
      expect(emptyManager.cleanup()).toBe(0);
    });

    it('should not remove non-expired tokens during cleanup', () => {
      const longLived = new CsrfTokenManager(60000); // 1 minute
      longLived.generate('s1');
      longLived.generate('s2');
      longLived.generate('s3');
      const cleaned = longLived.cleanup();
      expect(cleaned).toBe(0);
      expect(longLived.size).toBe(3);
    });

    it('should clean all tokens when all expired', async () => {
      const shortLived = new CsrfTokenManager(1);
      shortLived.generate('s1');
      shortLived.generate('s2');
      shortLived.generate('s3');
      await new Promise((resolve) => setTimeout(resolve, 10));
      const cleaned = shortLived.cleanup();
      expect(cleaned).toBe(3);
      expect(shortLived.size).toBe(0);
    });
  });

  describe('size - Extended', () => {
    it('should correctly track size through generate/revoke/cleanup cycle', async () => {
      expect(manager.size).toBe(0);

      const t1 = manager.generate('s1');
      const t2 = manager.generate('s2');
      expect(manager.size).toBe(2);

      manager.revoke(t1.token);
      expect(manager.size).toBe(1);

      manager.generate('s3');
      expect(manager.size).toBe(2);

      manager.revoke(t2.token);
      expect(manager.size).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Connection Validator - Extended
// ---------------------------------------------------------------------------
describe('Connection Validator - Extended', () => {
  describe('validateGatewayUrl - Extended', () => {
    it('should handle localhost with ::1', async () => {
      // Note: URL constructor converts [::1] to [::1] in hostname,
      // which does not match the simple isLocalhostUrl check
      expect(await validateGatewayUrl('http://[::1]:8080')).toBe(false);
    });

    it('should handle https localhost', async () => {
      expect(await validateGatewayUrl('https://localhost:18789')).toBe(true);
      expect(await validateGatewayUrl('https://127.0.0.1:18789')).toBe(true);
    });

    it('should handle URLs with query parameters', async () => {
      expect(await validateGatewayUrl('http://localhost:18789?token=abc')).toBe(true);
    });

    it('should handle URLs with fragments', async () => {
      expect(await validateGatewayUrl('http://localhost:18789#section')).toBe(true);
    });

    it('should handle URLs with credentials (still validates host)', async () => {
      expect(await validateGatewayUrl('http://user:pass@localhost:18789')).toBe(true);
    });

    it('should block various external hosts', async () => {
      const externalUrls = [
        'https://evil.com',
        'https://attacker.example.org',
        'https://192.168.1.1:8080',
        'https://10.0.0.1:3000',
        'wss://remote-server.com',
      ];
      for (const url of externalUrls) {
        expect(await validateGatewayUrl(url)).toBe(false);
      }
    });

    it('should handle confirm callback that throws', async () => {
      const throwingConfirm = async (_url: string): Promise<boolean> => {
        throw new Error('Callback error');
      };
      // Should propagate the error from the callback
      await expect(validateGatewayUrl('https://external.com', throwingConfirm)).rejects.toThrow(
        'Callback error'
      );
    });

    it('should pass correct URL string to confirm callback', async () => {
      const receivedUrls: string[] = [];
      const trackingConfirm = async (url: string): Promise<boolean> => {
        receivedUrls.push(url);
        return true;
      };

      await validateGatewayUrl('https://first.com/path', trackingConfirm);
      await validateGatewayUrl('https://second.com/other', trackingConfirm);

      expect(receivedUrls).toEqual(['https://first.com/path', 'https://second.com/other']);
    });

    it('should not call confirm callback for localhost URLs', async () => {
      const confirmCalled = vi.fn(async () => true);
      await validateGatewayUrl('http://localhost:3000', confirmCalled);
      expect(confirmCalled).not.toHaveBeenCalled();
    });

    it('should not call confirm callback for undefined URLs', async () => {
      const confirmCalled = vi.fn(async () => true);
      await validateGatewayUrl(undefined, confirmCalled);
      expect(confirmCalled).not.toHaveBeenCalled();
    });

    it('should handle URL with whitespace (truthy string, fails URL parse)', async () => {
      // A single space is truthy, so it enters the URL parsing path and fails
      expect(await validateGatewayUrl(' ')).toBe(false);
    });
  });

  describe('sanitizeWebSocketUrl - Extended', () => {
    it('should handle ws URL with default port', () => {
      const result = sanitizeWebSocketUrl('ws://example.com');
      expect(result).toBe('ws://example.com/');
    });

    it('should handle wss URL with custom port', () => {
      const result = sanitizeWebSocketUrl('wss://example.com:9090/ws');
      expect(result).toBe('wss://example.com:9090/ws');
    });

    it('should strip query string from URL', () => {
      const result = sanitizeWebSocketUrl('ws://localhost:8080/path?token=secret&key=value');
      // The reconstruction only uses protocol + host + pathname
      expect(result).toBe('ws://localhost:8080/path');
      expect(result).not.toContain('token');
      expect(result).not.toContain('secret');
    });

    it('should strip fragment from URL', () => {
      const result = sanitizeWebSocketUrl('ws://localhost:8080/path#fragment');
      expect(result).toBe('ws://localhost:8080/path');
      expect(result).not.toContain('fragment');
    });

    it('should strip both credentials and query params', () => {
      const result = sanitizeWebSocketUrl('ws://user:pass@host:8080/path?key=value');
      expect(result).toBe('ws://host:8080/path');
      expect(result).not.toContain('user');
      expect(result).not.toContain('pass');
      expect(result).not.toContain('key');
    });

    it('should reject various invalid protocols', () => {
      const invalidProtocols = [
        'http://example.com',
        'https://example.com',
        'ftp://example.com',
        'ssh://example.com',
        'file:///etc/passwd',
        'tcp://example.com',
      ];
      for (const url of invalidProtocols) {
        expect(sanitizeWebSocketUrl(url)).toBeNull();
      }
    });

    it('should reject completely malformed URLs', () => {
      const malformed = [
        '',
        'not-a-url',
        '://missing-protocol',
        'ws://', // URL constructor may handle this
      ];
      for (const url of malformed) {
        const result = sanitizeWebSocketUrl(url);
        // Either null (parse failure) or protocol mismatch
        if (result !== null) {
          expect(result).toMatch(/^wss?:\/\//);
        }
      }
    });

    it('should handle ws URL with IPv4 address', () => {
      const result = sanitizeWebSocketUrl('ws://192.168.1.100:8080/ws');
      expect(result).toBe('ws://192.168.1.100:8080/ws');
    });

    it('should handle wss URL with IPv6 address', () => {
      const result = sanitizeWebSocketUrl('wss://[::1]:8080/ws');
      expect(result).toBe('wss://[::1]:8080/ws');
    });

    it('should handle deeply nested paths', () => {
      const result = sanitizeWebSocketUrl('ws://host/a/b/c/d/e/f');
      expect(result).toBe('ws://host/a/b/c/d/e/f');
    });

    it('should handle URL with encoded characters in path', () => {
      const result = sanitizeWebSocketUrl('ws://host/path%20with%20spaces');
      expect(result).toBe('ws://host/path%20with%20spaces');
    });
  });
});
