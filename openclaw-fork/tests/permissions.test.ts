import { describe, it, expect } from 'vitest';
import {
  loadSecurityPolicy,
  isOperationAllowed,
  DEFAULT_SECURITY_POLICY,
} from '../src/permissions/security-policy.js';

describe('Security Policy', () => {
  it('should load valid security policy from config', () => {
    const policy = loadSecurityPolicy({
      allowShellAccess: true,
      allowedDirectories: ['/tmp'],
      allowedCommands: ['ls', 'cat'],
      requireCsrfToken: true,
      enableAuditLog: true,
    });
    expect(policy.allowShellAccess).toBe(true);
    expect(policy.allowedDirectories).toEqual(['/tmp']);
    expect(policy.allowedCommands).toEqual(['ls', 'cat']);
  });

  it('should fall back to defaults for invalid config', () => {
    const policy = loadSecurityPolicy('invalid config');
    expect(policy).toEqual(DEFAULT_SECURITY_POLICY);
  });

  it('should fill missing fields with defaults', () => {
    const policy = loadSecurityPolicy({});
    expect(policy.allowShellAccess).toBe(false);
    expect(policy.requireCsrfToken).toBe(true);
    expect(policy.enableAuditLog).toBe(true);
  });

  it('should have secure defaults (restricted mode)', () => {
    expect(DEFAULT_SECURITY_POLICY.allowShellAccess).toBe(false);
    expect(DEFAULT_SECURITY_POLICY.requireCsrfToken).toBe(true);
    expect(DEFAULT_SECURITY_POLICY.enableAuditLog).toBe(true);
    expect(DEFAULT_SECURITY_POLICY.allowedDirectories).toEqual([]);
    expect(DEFAULT_SECURITY_POLICY.allowedCommands).toEqual([]);
  });
});

describe('Operation Permission Check', () => {
  it('should block shell access in default policy', () => {
    expect(isOperationAllowed('shell', DEFAULT_SECURITY_POLICY)).toBe(false);
  });

  it('should allow shell when policy permits', () => {
    const policy = { ...DEFAULT_SECURITY_POLICY, allowShellAccess: true };
    expect(isOperationAllowed('shell', policy)).toBe(true);
  });

  it('should block file access when no directories configured', () => {
    expect(isOperationAllowed('file_read', DEFAULT_SECURITY_POLICY)).toBe(false);
  });

  it('should allow file access when directories configured', () => {
    const policy = { ...DEFAULT_SECURITY_POLICY, allowedDirectories: ['/tmp'] };
    expect(isOperationAllowed('file_read', policy)).toBe(true);
  });

  it('should block commands when no commands configured and shell disabled', () => {
    expect(isOperationAllowed('command', DEFAULT_SECURITY_POLICY)).toBe(false);
  });

  it('should allow commands when commands configured', () => {
    const policy = { ...DEFAULT_SECURITY_POLICY, allowedCommands: ['ls'] };
    expect(isOperationAllowed('command', policy)).toBe(true);
  });

  it('should always allow network by default', () => {
    expect(isOperationAllowed('network', DEFAULT_SECURITY_POLICY)).toBe(true);
  });
});
