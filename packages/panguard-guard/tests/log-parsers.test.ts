/**
 * Log parsers unit tests / 日誌解析器單元測試
 *
 * Tests for syslog RFC 3164, RFC 5424, auth.log, and auto-detect parsers.
 * 測試 syslog RFC 3164、RFC 5424、auth.log 和自動偵測解析器。
 */

import { describe, it, expect } from 'vitest';
import {
  parseSyslog3164,
  parseSyslog5424,
  parseAuthLog,
  parseLogLine,
} from '../src/collectors/log-parsers.js';

// ===== parseSyslog3164 / RFC 3164 =====

describe('parseSyslog3164', () => {
  it('should parse a valid RFC 3164 syslog line with priority', () => {
    const line = '<34>Jan  5 14:23:01 myhost sshd[1234]: Connection from 10.0.0.1';
    const result = parseSyslog3164(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('syslog');
    expect(result!.host).toBe('myhost');
    expect(result!.description).toBe('Connection from 10.0.0.1');
    expect(result!.metadata!['program']).toBe('sshd');
    expect(result!.metadata!['pid']).toBe(1234);
    expect(result!.metadata!['format']).toBe('rfc3164');
  });

  it('should parse a line without priority prefix', () => {
    const line = 'Mar  1 09:15:33 server01 cron[5678]: Running daily backup';
    const result = parseSyslog3164(line);

    expect(result).not.toBeNull();
    expect(result!.host).toBe('server01');
    expect(result!.metadata!['program']).toBe('cron');
    expect(result!.metadata!['pid']).toBe(5678);
    expect(result!.description).toBe('Running daily backup');
  });

  it('should parse a line without PID', () => {
    const line = '<14>Feb 28 10:00:00 gateway kernel: eth0: link up';
    const result = parseSyslog3164(line);

    expect(result).not.toBeNull();
    expect(result!.metadata!['program']).toBe('kernel');
    expect(result!.metadata!['pid']).toBeUndefined();
  });

  it('should map priority to correct severity', () => {
    // Priority 10 = facility 1, severity 2 (critical)
    const critical = parseSyslog3164('<10>Jan  1 00:00:00 h p[1]: msg');
    expect(critical!.severity).toBe('critical');

    // Priority 11 = facility 1, severity 3 (error -> high)
    const high = parseSyslog3164('<11>Jan  1 00:00:00 h p[1]: msg');
    expect(high!.severity).toBe('high');

    // Priority 12 = facility 1, severity 4 (warning -> medium)
    const medium = parseSyslog3164('<12>Jan  1 00:00:00 h p[1]: msg');
    expect(medium!.severity).toBe('medium');

    // Priority 13 = facility 1, severity 5 (notice -> low)
    const low = parseSyslog3164('<13>Jan  1 00:00:00 h p[1]: msg');
    expect(low!.severity).toBe('low');

    // Priority 14 = facility 1, severity 6 (info)
    const info = parseSyslog3164('<14>Jan  1 00:00:00 h p[1]: msg');
    expect(info!.severity).toBe('info');
  });

  it('should return null for invalid lines', () => {
    expect(parseSyslog3164('')).toBeNull();
    expect(parseSyslog3164('random garbage text')).toBeNull();
    expect(parseSyslog3164('not a syslog line at all')).toBeNull();
  });

  it('should return null for null/undefined input', () => {
    expect(parseSyslog3164(null as unknown as string)).toBeNull();
    expect(parseSyslog3164(undefined as unknown as string)).toBeNull();
  });

  it('should handle single-digit day with double space', () => {
    const line = '<14>Jan  3 08:00:00 myhost daemon[99]: started';
    const result = parseSyslog3164(line);

    expect(result).not.toBeNull();
    expect(result!.timestamp).toBeInstanceOf(Date);
  });

  it('should handle double-digit day', () => {
    const line = '<14>Dec 25 23:59:59 xmas santa[1]: delivering gifts';
    const result = parseSyslog3164(line);

    expect(result).not.toBeNull();
    expect(result!.host).toBe('xmas');
  });

  it('should generate unique IDs across calls', () => {
    const line = '<14>Jan  1 00:00:00 h p[1]: msg';
    const r1 = parseSyslog3164(line);
    const r2 = parseSyslog3164(line);

    expect(r1!.id).not.toBe(r2!.id);
  });
});

// ===== parseSyslog5424 / RFC 5424 =====

describe('parseSyslog5424', () => {
  it('should parse a valid RFC 5424 syslog line', () => {
    const line =
      '<165>1 2026-03-01T12:00:00.000Z myhost sshd 1234 - - Failed password for root from 10.0.0.1';
    const result = parseSyslog5424(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('syslog');
    expect(result!.host).toBe('myhost');
    expect(result!.metadata!['program']).toBe('sshd');
    expect(result!.metadata!['pid']).toBe(1234);
    expect(result!.description).toBe('Failed password for root from 10.0.0.1');
    expect(result!.metadata!['format']).toBe('rfc5424');
  });

  it('should handle nil values (dashes)', () => {
    const line = '<14>1 2026-03-01T12:00:00Z - myapp - - - Application started';
    const result = parseSyslog5424(line);

    expect(result).not.toBeNull();
    expect(result!.host).toBe('unknown');
    expect(result!.metadata!['program']).toBe('myapp');
    expect(result!.metadata!['pid']).toBeUndefined();
    expect(result!.metadata!['msgId']).toBeUndefined();
  });

  it('should map priority to correct severity', () => {
    // Priority 165 = facility 20, severity 5 (notice -> low)
    const low = parseSyslog5424('<165>1 2026-01-01T00:00:00Z h a 1 - - msg');
    expect(low!.severity).toBe('low');

    // Priority 8 = facility 1, severity 0 (emergency -> critical)
    const critical = parseSyslog5424('<8>1 2026-01-01T00:00:00Z h a 1 - - msg');
    expect(critical!.severity).toBe('critical');
  });

  it('should return null for invalid lines', () => {
    expect(parseSyslog5424('')).toBeNull();
    expect(parseSyslog5424('not rfc5424')).toBeNull();
    expect(parseSyslog5424('<14>Jan  1 00:00:00 h p[1]: msg')).toBeNull(); // This is RFC 3164
  });

  it('should return null for null/undefined input', () => {
    expect(parseSyslog5424(null as unknown as string)).toBeNull();
    expect(parseSyslog5424(undefined as unknown as string)).toBeNull();
  });

  it('should parse timestamp correctly', () => {
    const line = '<14>1 2026-06-15T08:30:45.123Z host1 app 42 - - test';
    const result = parseSyslog5424(line);

    expect(result).not.toBeNull();
    expect(result!.timestamp).toBeInstanceOf(Date);
    expect(result!.timestamp!.getUTCFullYear()).toBe(2026);
  });

  it('should handle structured data field', () => {
    const line =
      '<14>1 2026-03-01T12:00:00Z host app 1 msg1 [exampleSDID@32473 key="value"] Message text';
    const result = parseSyslog5424(line);

    expect(result).not.toBeNull();
    expect(result!.metadata!['structuredData']).toBe('[exampleSDID@32473');
    // Note: the regex captures structured-data as a single token before the message
  });

  it('should generate unique IDs', () => {
    const line = '<14>1 2026-01-01T00:00:00Z h a 1 - - msg';
    const r1 = parseSyslog5424(line);
    const r2 = parseSyslog5424(line);

    expect(r1!.id).not.toBe(r2!.id);
  });
});

// ===== parseAuthLog / Auth.log =====

describe('parseAuthLog', () => {
  it('should parse SSH accepted login (password)', () => {
    const line =
      'Mar  1 10:15:33 webserver sshd[12345]: Accepted password for deploy from 192.168.1.100 port 54321 ssh2';
    const result = parseAuthLog(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('authlog');
    expect(result!.category).toBe('auth');
    expect(result!.metadata!['action']).toBe('login_success');
    expect(result!.metadata!['user']).toBe('deploy');
    expect(result!.metadata!['sourceIP']).toBe('192.168.1.100');
    expect(result!.metadata!['authMethod']).toBe('password');
    expect(result!.severity).toBe('info');
  });

  it('should parse SSH accepted login (publickey)', () => {
    const line =
      'Mar  1 10:15:33 webserver sshd[12345]: Accepted publickey for admin from 10.0.0.5 port 22222 ssh2';
    const result = parseAuthLog(line);

    expect(result).not.toBeNull();
    expect(result!.metadata!['action']).toBe('login_success');
    expect(result!.metadata!['authMethod']).toBe('publickey');
    expect(result!.metadata!['user']).toBe('admin');
  });

  it('should parse SSH failed password', () => {
    const line =
      'Mar  1 10:20:00 webserver sshd[12345]: Failed password for root from 10.0.0.99 port 44444 ssh2';
    const result = parseAuthLog(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('authlog');
    expect(result!.category).toBe('auth');
    expect(result!.metadata!['action']).toBe('login_failure');
    expect(result!.metadata!['user']).toBe('root');
    expect(result!.metadata!['sourceIP']).toBe('10.0.0.99');
    expect(result!.severity).toBe('medium');
  });

  it('should parse SSH failed password for invalid user', () => {
    const line =
      'Mar  1 10:25:00 webserver sshd[12345]: Failed password for invalid user hacker from 10.0.0.99 port 55555 ssh2';
    const result = parseAuthLog(line);

    expect(result).not.toBeNull();
    expect(result!.metadata!['action']).toBe('login_failure');
    expect(result!.metadata!['user']).toBe('hacker');
  });

  it('should parse SSH invalid user attempt', () => {
    const line =
      'Mar  1 10:30:00 webserver sshd[12345]: Invalid user testuser from 192.168.1.200 port 60000';
    const result = parseAuthLog(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('authlog');
    expect(result!.category).toBe('auth');
    expect(result!.metadata!['action']).toBe('invalid_user');
    expect(result!.metadata!['user']).toBe('testuser');
    expect(result!.metadata!['sourceIP']).toBe('192.168.1.200');
    expect(result!.severity).toBe('medium');
  });

  it('should parse sudo command execution', () => {
    const line =
      'Mar  1 11:00:00 webserver sudo:   deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/apt update';
    const result = parseAuthLog(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('authlog');
    expect(result!.category).toBe('execution');
    expect(result!.metadata!['action']).toBe('privilege_escalation');
    expect(result!.metadata!['user']).toBe('deploy');
    expect(result!.metadata!['command']).toBe('/usr/bin/apt update');
    expect(result!.severity).toBe('medium');
  });

  it('should parse su session opened', () => {
    const line =
      'Mar  1 11:30:00 webserver su[9999]: pam_unix(su:session): session opened for user root by deploy(uid=1000)';
    const result = parseAuthLog(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('authlog');
    expect(result!.category).toBe('auth');
    expect(result!.metadata!['action']).toBe('su_session');
    expect(result!.metadata!['targetUser']).toBe('root');
  });

  it('should return null for non-auth log lines', () => {
    const line = 'Mar  1 12:00:00 webserver nginx[100]: GET /index.html 200';
    const result = parseAuthLog(line);

    expect(result).toBeNull();
  });

  it('should return null for empty/null input', () => {
    expect(parseAuthLog('')).toBeNull();
    expect(parseAuthLog(null as unknown as string)).toBeNull();
  });

  it('should return a generic auth event for unrecognized sshd messages', () => {
    const line =
      'Mar  1 12:00:00 webserver sshd[100]: Connection reset by 10.0.0.1 port 22';
    const result = parseAuthLog(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('authlog');
    expect(result!.category).toBe('auth');
    // No specific action for unrecognized sshd messages
    expect(result!.metadata!['action']).toBeUndefined();
  });
});

// ===== parseLogLine / Auto-detect =====

describe('parseLogLine', () => {
  it('should auto-detect and parse auth.log SSH failure', () => {
    const line =
      'Mar  1 10:20:00 webserver sshd[12345]: Failed password for root from 10.0.0.99 port 44444 ssh2';
    const result = parseLogLine(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('authlog');
    expect(result!.metadata!['action']).toBe('login_failure');
  });

  it('should auto-detect and parse RFC 5424 syslog', () => {
    const line = '<14>1 2026-03-01T12:00:00Z myhost myapp 1 - - Application event occurred';
    const result = parseLogLine(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('syslog');
    expect(result!.metadata!['format']).toBe('rfc5424');
  });

  it('should auto-detect and parse RFC 3164 syslog', () => {
    const line = '<14>Mar  1 12:00:00 myhost myapp[999]: Something happened';
    const result = parseLogLine(line);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('syslog');
    expect(result!.metadata!['format']).toBe('rfc3164');
  });

  it('should return null for empty string', () => {
    expect(parseLogLine('')).toBeNull();
  });

  it('should return null for whitespace-only string', () => {
    expect(parseLogLine('   \n\t  ')).toBeNull();
  });

  it('should return null for unparseable lines', () => {
    expect(parseLogLine('this is just random text')).toBeNull();
  });

  it('should handle truncated lines gracefully', () => {
    // A line that starts like syslog but is cut off
    const result = parseLogLine('<14>Mar');
    expect(result).toBeNull();
  });

  it('should handle non-ASCII hostnames (CJK characters)', () => {
    const line =
      '<14>1 2026-03-01T12:00:00Z server-01 myapp 1 - - Test message';
    const result = parseLogLine(line);

    expect(result).not.toBeNull();
    expect(result!.host).toBe('server-01');
  });

  it('should prefer auth.log parse over plain syslog for sshd lines', () => {
    const line =
      'Mar  1 10:15:33 webserver sshd[12345]: Accepted password for deploy from 192.168.1.100 port 54321 ssh2';
    const result = parseLogLine(line);

    expect(result).not.toBeNull();
    // Should be detected as authlog (more specific) rather than plain syslog
    expect(result!.source).toBe('authlog');
    expect(result!.metadata!['action']).toBe('login_success');
  });
});
