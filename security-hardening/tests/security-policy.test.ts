import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadSecurityPolicy,
  isOperationAllowed,
  DEFAULT_SECURITY_POLICY,
  SecurityPolicySchema,
} from '../src/permissions/security-policy.js';
import type { SecurityPolicy } from '../src/types.js';
import type { OperationType } from '../src/permissions/security-policy.js';

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
// Security Policy Loading - Extended
// ---------------------------------------------------------------------------
describe('Security Policy Loading - Extended', () => {
  describe('loadSecurityPolicy edge cases', () => {
    it('should handle deeply nested invalid types gracefully', () => {
      const policy = loadSecurityPolicy({
        allowShellAccess: 'not-a-boolean',
        allowedDirectories: 'not-an-array',
      });
      // Invalid types cause validation failure -> defaults
      expect(policy).toEqual(DEFAULT_SECURITY_POLICY);
    });

    it('should handle undefined input', () => {
      const policy = loadSecurityPolicy(undefined);
      expect(policy).toEqual(DEFAULT_SECURITY_POLICY);
    });

    it('should handle boolean input', () => {
      const policy = loadSecurityPolicy(true);
      expect(policy).toEqual(DEFAULT_SECURITY_POLICY);
    });

    it('should handle empty string input', () => {
      const policy = loadSecurityPolicy('');
      expect(policy).toEqual(DEFAULT_SECURITY_POLICY);
    });

    it('should accept valid syslog port boundaries', () => {
      const policy1 = loadSecurityPolicy({ syslogPort: 1 });
      expect(policy1.syslogPort).toBe(1);

      const policy2 = loadSecurityPolicy({ syslogPort: 65535 });
      expect(policy2.syslogPort).toBe(65535);
    });

    it('should reject syslog port above 65535', () => {
      const policy = loadSecurityPolicy({ syslogPort: 65536 });
      expect(policy).toEqual(DEFAULT_SECURITY_POLICY);
    });

    it('should handle extra unknown fields by ignoring them', () => {
      const policy = loadSecurityPolicy({
        allowShellAccess: true,
        unknownField: 'should be ignored',
        anotherUnknown: 42,
      });
      // The policy should load without error
      expect(policy.allowShellAccess).toBe(true);
    });

    it('should handle allowedDirectories with empty strings', () => {
      const policy = loadSecurityPolicy({
        allowedDirectories: ['', '/tmp', ''],
      });
      expect(policy.allowedDirectories).toEqual(['', '/tmp', '']);
    });

    it('should handle allowedOrigins with various URL formats', () => {
      const origins = ['http://localhost:3000', 'https://example.com', 'http://192.168.1.1:8080'];
      const policy = loadSecurityPolicy({ allowedOrigins: origins });
      expect(policy.allowedOrigins).toEqual(origins);
    });

    it('should preserve all fields when fully specified', () => {
      const fullConfig = {
        allowShellAccess: true,
        allowedDirectories: ['/tmp', '/home/user'],
        allowedCommands: ['ls', 'cat', 'grep'],
        requireCsrfToken: false,
        allowedOrigins: ['https://myapp.com'],
        enableAuditLog: false,
        syslogServer: 'syslog.corp.net',
        syslogPort: 1514,
      };
      const policy = loadSecurityPolicy(fullConfig);
      expect(policy.allowShellAccess).toBe(true);
      expect(policy.allowedDirectories).toEqual(['/tmp', '/home/user']);
      expect(policy.allowedCommands).toEqual(['ls', 'cat', 'grep']);
      expect(policy.requireCsrfToken).toBe(false);
      expect(policy.allowedOrigins).toEqual(['https://myapp.com']);
      expect(policy.enableAuditLog).toBe(false);
      expect(policy.syslogServer).toBe('syslog.corp.net');
      expect(policy.syslogPort).toBe(1514);
    });
  });

  describe('SecurityPolicySchema - Extended', () => {
    it('should reject non-string syslog server', () => {
      const result = SecurityPolicySchema.safeParse({ syslogServer: 12345 });
      expect(result.success).toBe(false);
    });

    it('should reject array of numbers for allowedDirectories', () => {
      const result = SecurityPolicySchema.safeParse({ allowedDirectories: [1, 2, 3] });
      expect(result.success).toBe(false);
    });

    it('should reject array of numbers for allowedCommands', () => {
      const result = SecurityPolicySchema.safeParse({ allowedCommands: [42] });
      expect(result.success).toBe(false);
    });

    it('should accept empty arrays', () => {
      const result = SecurityPolicySchema.safeParse({
        allowedDirectories: [],
        allowedCommands: [],
        allowedOrigins: [],
      });
      expect(result.success).toBe(true);
    });

    it('should reject nested objects in arrays', () => {
      const result = SecurityPolicySchema.safeParse({
        allowedDirectories: [{ path: '/tmp' }],
      });
      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Operation Permission Check - Extended
// ---------------------------------------------------------------------------
describe('Operation Permission Check - Extended', () => {
  describe('combined policy scenarios', () => {
    it('should block shell and commands when all disabled', () => {
      const restrictive: SecurityPolicy = {
        allowShellAccess: false,
        allowedDirectories: [],
        allowedCommands: [],
        requireCsrfToken: true,
        allowedOrigins: [],
        enableAuditLog: true,
      };
      expect(isOperationAllowed('shell', restrictive)).toBe(false);
      expect(isOperationAllowed('command', restrictive)).toBe(false);
      expect(isOperationAllowed('file_read', restrictive)).toBe(false);
      expect(isOperationAllowed('file_write', restrictive)).toBe(false);
    });

    it('should allow all operations in permissive policy', () => {
      const permissive: SecurityPolicy = {
        allowShellAccess: true,
        allowedDirectories: ['/'],
        allowedCommands: ['ls', 'cat'],
        requireCsrfToken: false,
        allowedOrigins: ['*'],
        enableAuditLog: false,
      };
      expect(isOperationAllowed('shell', permissive)).toBe(true);
      expect(isOperationAllowed('command', permissive)).toBe(true);
      expect(isOperationAllowed('file_read', permissive)).toBe(true);
      expect(isOperationAllowed('file_write', permissive)).toBe(true);
      expect(isOperationAllowed('network', permissive)).toBe(true);
    });

    it('should allow commands via shell access even with empty command list', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        allowShellAccess: true,
        allowedCommands: [],
      };
      expect(isOperationAllowed('command', policy)).toBe(true);
    });

    it('should allow commands via whitelist even without shell access', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        allowShellAccess: false,
        allowedCommands: ['node'],
      };
      expect(isOperationAllowed('command', policy)).toBe(true);
    });

    it('should handle file operations independently of shell access', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        allowShellAccess: true,
        allowedDirectories: [],
      };
      // Shell access does NOT grant file_read/file_write
      expect(isOperationAllowed('file_read', policy)).toBe(false);
      expect(isOperationAllowed('file_write', policy)).toBe(false);
    });

    it('should treat file_read and file_write identically (both check directories)', () => {
      const withDirs: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        allowedDirectories: ['/tmp'],
      };
      const withoutDirs: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        allowedDirectories: [],
      };

      expect(isOperationAllowed('file_read', withDirs)).toBe(true);
      expect(isOperationAllowed('file_write', withDirs)).toBe(true);
      expect(isOperationAllowed('file_read', withoutDirs)).toBe(false);
      expect(isOperationAllowed('file_write', withoutDirs)).toBe(false);
    });
  });

  describe('all known operation types', () => {
    const allOps: OperationType[] = ['shell', 'file_read', 'file_write', 'command', 'network'];

    it('should handle every known operation type without error', () => {
      for (const op of allOps) {
        expect(() => isOperationAllowed(op, DEFAULT_SECURITY_POLICY)).not.toThrow();
      }
    });

    it('should return boolean for every operation type', () => {
      for (const op of allOps) {
        const result = isOperationAllowed(op, DEFAULT_SECURITY_POLICY);
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('DEFAULT_SECURITY_POLICY immutability', () => {
    it('should not change after loading policies', () => {
      const original = { ...DEFAULT_SECURITY_POLICY };
      loadSecurityPolicy({ allowShellAccess: true });
      expect(DEFAULT_SECURITY_POLICY).toEqual(original);
    });

    it('should maintain the same values across multiple reads', () => {
      const read1 = DEFAULT_SECURITY_POLICY;
      const read2 = DEFAULT_SECURITY_POLICY;
      expect(read1).toEqual(read2);
      expect(read1.allowShellAccess).toBe(false);
      expect(read1.requireCsrfToken).toBe(true);
      expect(read1.enableAuditLog).toBe(true);
    });
  });
});
