import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatSyslogMessage, SyslogAdapter } from '../src/audit/syslog-adapter.js';
import type { AuditEvent } from '../src/types.js';

// Suppress log output during tests
beforeEach(() => {
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Audit Logger
// ---------------------------------------------------------------------------
describe('Audit Logger', () => {
  describe('logAuditEvent', () => {
    it('should not throw for a success event', async () => {
      const { logAuditEvent } = await import('../src/audit/audit-logger.js');
      expect(() =>
        logAuditEvent({
          level: 'info',
          action: 'websocket_connect',
          target: 'http://localhost:18789',
          result: 'success',
        })
      ).not.toThrow();
    });

    it('should not throw for a blocked event', async () => {
      const { logAuditEvent } = await import('../src/audit/audit-logger.js');
      expect(() =>
        logAuditEvent({
          level: 'warn',
          action: 'command_execution',
          target: 'rm -rf /',
          result: 'blocked',
        })
      ).not.toThrow();
    });

    it('should not throw for a failure event', async () => {
      const { logAuditEvent } = await import('../src/audit/audit-logger.js');
      expect(() =>
        logAuditEvent({
          level: 'error',
          action: 'credential_access',
          target: 'telegram:bot',
          result: 'failure',
        })
      ).not.toThrow();
    });

    it('should accept optional context', async () => {
      const { logAuditEvent } = await import('../src/audit/audit-logger.js');
      expect(() =>
        logAuditEvent({
          level: 'info',
          action: 'file_access',
          target: '/tmp/test.txt',
          result: 'success',
          context: { user: 'testuser', operation: 'read' },
        })
      ).not.toThrow();
    });

    it('should handle all audit action types', async () => {
      const { logAuditEvent } = await import('../src/audit/audit-logger.js');
      const actions = [
        'websocket_connect',
        'credential_access',
        'credential_migrate',
        'file_access',
        'command_execution',
        'policy_check',
        'security_scan',
      ] as const;

      for (const action of actions) {
        expect(() =>
          logAuditEvent({
            level: 'info',
            action,
            target: 'test-target',
            result: 'success',
          })
        ).not.toThrow();
      }
    });
  });

  describe('logWebSocketConnect', () => {
    it('should log successful connections', async () => {
      const { logWebSocketConnect } = await import('../src/audit/audit-logger.js');
      expect(() => logWebSocketConnect('http://localhost:18789', 'success')).not.toThrow();
    });

    it('should log blocked connections', async () => {
      const { logWebSocketConnect } = await import('../src/audit/audit-logger.js');
      expect(() => logWebSocketConnect('https://evil.com', 'blocked')).not.toThrow();
    });

    it('should include IP address when provided', async () => {
      const { logWebSocketConnect } = await import('../src/audit/audit-logger.js');
      expect(() =>
        logWebSocketConnect('https://evil.com', 'blocked', '192.168.1.100')
      ).not.toThrow();
    });

    it('should handle undefined IP address gracefully', async () => {
      const { logWebSocketConnect } = await import('../src/audit/audit-logger.js');
      expect(() => logWebSocketConnect('http://localhost', 'success', undefined)).not.toThrow();
    });
  });

  describe('logCredentialAccess', () => {
    it('should log successful credential access', async () => {
      const { logCredentialAccess } = await import('../src/audit/audit-logger.js');
      expect(() => logCredentialAccess('telegram', 'bot', 'success')).not.toThrow();
    });

    it('should log failed credential access', async () => {
      const { logCredentialAccess } = await import('../src/audit/audit-logger.js');
      expect(() => logCredentialAccess('openai', 'default', 'failure')).not.toThrow();
    });
  });

  describe('logFileAccess', () => {
    it('should log allowed file access', async () => {
      const { logFileAccess } = await import('../src/audit/audit-logger.js');
      expect(() => logFileAccess('/tmp/safe-file.txt', 'success')).not.toThrow();
    });

    it('should log blocked file access', async () => {
      const { logFileAccess } = await import('../src/audit/audit-logger.js');
      expect(() => logFileAccess('/etc/shadow', 'blocked')).not.toThrow();
    });
  });

  describe('logCommandExecution', () => {
    it('should log allowed command', async () => {
      const { logCommandExecution } = await import('../src/audit/audit-logger.js');
      expect(() => logCommandExecution('ls -la', 'success')).not.toThrow();
    });

    it('should log blocked command', async () => {
      const { logCommandExecution } = await import('../src/audit/audit-logger.js');
      expect(() => logCommandExecution('rm -rf /', 'blocked')).not.toThrow();
    });
  });

  describe('logPolicyCheck', () => {
    it('should log allowed policy check', async () => {
      const { logPolicyCheck } = await import('../src/audit/audit-logger.js');
      expect(() => logPolicyCheck('file_read', 'success')).not.toThrow();
    });

    it('should log blocked policy check', async () => {
      const { logPolicyCheck } = await import('../src/audit/audit-logger.js');
      expect(() => logPolicyCheck('shell', 'blocked')).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Syslog Adapter
// ---------------------------------------------------------------------------
describe('Syslog Adapter', () => {
  describe('formatSyslogMessage', () => {
    it('should format RFC 5424 message with correct structure', () => {
      const event: AuditEvent = {
        timestamp: '2025-02-25T10:30:00.000Z',
        level: 'warn',
        action: 'websocket_connect',
        target: 'https://evil.com',
        result: 'blocked',
        module: 'audit',
      };

      const message = formatSyslogMessage(event);

      // RFC 5424 starts with <priority>VERSION
      expect(message).toMatch(/^<\d+>1 /);
      // Contains timestamp
      expect(message).toContain('2025-02-25T10:30:00.000Z');
      // Contains app name
      expect(message).toContain('panguard-ai');
      // Contains process ID
      expect(message).toContain(String(process.pid));
      // Contains message ID = action
      expect(message).toContain('websocket_connect');
      // Contains structured data
      expect(message).toContain('[panguard');
      expect(message).toContain('action="websocket_connect"');
      expect(message).toContain('target="https://evil.com"');
      expect(message).toContain('result="blocked"');
    });

    it('should calculate correct priority for error level (facility=16, severity=3)', () => {
      const event: AuditEvent = {
        timestamp: new Date().toISOString(),
        level: 'error',
        action: 'command_execution',
        target: 'rm -rf /',
        result: 'blocked',
        module: 'audit',
      };

      const message = formatSyslogMessage(event);
      // priority = facility*8 + severity = 16*8 + 3 = 131
      expect(message).toMatch(/^<131>/);
    });

    it('should calculate correct priority for warn level (facility=16, severity=4)', () => {
      const event: AuditEvent = {
        timestamp: new Date().toISOString(),
        level: 'warn',
        action: 'file_access',
        target: '/etc/passwd',
        result: 'blocked',
        module: 'audit',
      };

      const message = formatSyslogMessage(event);
      // priority = 16*8 + 4 = 132
      expect(message).toMatch(/^<132>/);
    });

    it('should calculate correct priority for info level (facility=16, severity=6)', () => {
      const event: AuditEvent = {
        timestamp: new Date().toISOString(),
        level: 'info',
        action: 'policy_check',
        target: 'shell',
        result: 'success',
        module: 'audit',
      };

      const message = formatSyslogMessage(event);
      // priority = 16*8 + 6 = 134
      expect(message).toMatch(/^<134>/);
    });

    it('should default to informational severity (6) for unknown log level', () => {
      const event: AuditEvent = {
        timestamp: new Date().toISOString(),
        level: 'info',
        action: 'security_scan',
        target: 'full-scan',
        result: 'success',
        module: 'audit',
      };

      // Cast to force unknown level
      const eventWithBadLevel = { ...event, level: 'unknown' as AuditEvent['level'] };
      const message = formatSyslogMessage(eventWithBadLevel);
      // Should default to severity 6: priority = 16*8 + 6 = 134
      expect(message).toMatch(/^<134>/);
    });

    it('should include the human-readable message at the end', () => {
      const event: AuditEvent = {
        timestamp: '2025-01-01T00:00:00.000Z',
        level: 'info',
        action: 'credential_access',
        target: 'telegram:bot',
        result: 'success',
        module: 'audit',
      };

      const message = formatSyslogMessage(event);
      expect(message).toContain('credential_access: success -> telegram:bot');
    });
  });

  describe('SyslogAdapter class', () => {
    it('should create adapter with host and default port', () => {
      const adapter = new SyslogAdapter('syslog.example.com');
      // Should not throw on construction
      expect(adapter).toBeDefined();
      adapter.close();
    });

    it('should create adapter with custom port', () => {
      const adapter = new SyslogAdapter('syslog.example.com', 1514);
      expect(adapter).toBeDefined();
      adapter.close();
    });

    it('should send audit event via UDP without throwing', () => {
      const adapter = new SyslogAdapter('127.0.0.1', 65000);

      const event: AuditEvent = {
        timestamp: new Date().toISOString(),
        level: 'info',
        action: 'policy_check',
        target: 'shell',
        result: 'success',
        module: 'audit',
      };

      // send() is fire-and-forget; it should not throw
      expect(() => adapter.send(event)).not.toThrow();
      adapter.close();
    });

    it('should create socket on first send and reuse it', () => {
      const adapter = new SyslogAdapter('127.0.0.1', 65001);

      const event: AuditEvent = {
        timestamp: new Date().toISOString(),
        level: 'warn',
        action: 'websocket_connect',
        target: 'https://evil.com',
        result: 'blocked',
        module: 'audit',
      };

      // First send creates the socket
      adapter.send(event);
      // Second send reuses it
      adapter.send(event);

      adapter.close();
    });

    it('should handle close when no socket has been opened', () => {
      const adapter = new SyslogAdapter('127.0.0.1');
      // Close without ever sending - should be a no-op
      expect(() => adapter.close()).not.toThrow();
    });

    it('should handle close after close (double close)', () => {
      const adapter = new SyslogAdapter('127.0.0.1', 65002);

      const event: AuditEvent = {
        timestamp: new Date().toISOString(),
        level: 'info',
        action: 'security_scan',
        target: 'full',
        result: 'success',
        module: 'audit',
      };

      adapter.send(event);
      adapter.close();
      // Second close should be safe
      expect(() => adapter.close()).not.toThrow();
    });
  });
});
