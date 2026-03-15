/**
 * SecretWatcher unit tests
 * SecretWatcher 單元測試
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { SecurityEvent } from '@panguard-ai/core';
import { SecretWatcher } from '../src/watchers/secret-watcher.js';

/** Create a unique temp directory for each test */
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'secret-watcher-test-'));
}

/** Remove a temp directory and its contents */
function removeTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/** Collect events emitted by a watcher */
function collectEvents(watcher: SecretWatcher): SecurityEvent[] {
  const events: SecurityEvent[] = [];
  watcher.on('event', (event: SecurityEvent) => {
    events.push(event);
  });
  return events;
}

/** Wait for a short duration (for fs.watch debounce) */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('SecretWatcher', () => {
  let tempDir: string;
  let watcher: SecretWatcher;

  beforeEach(() => {
    tempDir = createTempDir();
    watcher = new SecretWatcher(tempDir);
  });

  afterEach(() => {
    watcher.stop();
    removeTempDir(tempDir);
  });

  describe('checkAvailability', () => {
    it('should return true for a valid readable directory', async () => {
      const result = await watcher.checkAvailability();
      expect(result).toBe(true);
    });

    it('should return false for a nonexistent directory', async () => {
      const badWatcher = new SecretWatcher('/nonexistent/path/that/does/not/exist');
      const result = await badWatcher.checkAvailability();
      expect(result).toBe(false);
      badWatcher.stop();
    });
  });

  describe('secret detection - AWS keys', () => {
    it('should detect AWS access key in .env file', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n');

      const events = collectEvents(watcher);
      await watcher.start();

      // Wait for initial scan
      await wait(200);
      watcher.stop();

      const secretEvents = events.filter((e) => e.category === 'credential-access');
      expect(secretEvents.length).toBeGreaterThanOrEqual(1);

      const awsEvent = secretEvents.find((e) => e.description.includes('AWS Access Key'));
      expect(awsEvent).toBeDefined();
      expect(awsEvent!.severity).toBe('critical');
      expect(awsEvent!.source).toBe('file');
      expect(awsEvent!.metadata['patternId']).toBe('aws-key');
    });

    it('should detect AWS secret key in .env file', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(
        envPath,
        'aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY1234\n'
      );

      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);
      watcher.stop();

      const awsEvent = events.find((e) => e.description.includes('AWS Secret Key'));
      expect(awsEvent).toBeDefined();
      expect(awsEvent!.severity).toBe('critical');
    });
  });

  describe('secret detection - GitHub tokens', () => {
    it('should detect GitHub personal access token', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij\n');

      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);
      watcher.stop();

      const ghEvent = events.find((e) => e.description.includes('GitHub Token'));
      expect(ghEvent).toBeDefined();
      expect(ghEvent!.severity).toBe('high');
      expect(ghEvent!.metadata['patternId']).toBe('github-token');
    });
  });

  describe('secret detection - private keys (critical severity)', () => {
    it('should detect RSA private key with critical severity', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----"\n');

      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);
      watcher.stop();

      const pkEvent = events.find((e) => e.description.includes('Private Key'));
      expect(pkEvent).toBeDefined();
      expect(pkEvent!.severity).toBe('critical');
      expect(pkEvent!.metadata['patternId']).toBe('private-key');
    });

    it('should detect EC private key', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'KEY="-----BEGIN EC PRIVATE KEY-----"\n');

      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);
      watcher.stop();

      const pkEvent = events.find((e) => e.description.includes('Private Key'));
      expect(pkEvent).toBeDefined();
      expect(pkEvent!.severity).toBe('critical');
    });
  });

  describe('comment handling', () => {
    it('should ignore lines starting with # (comments)', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(
        envPath,
        [
          '# AKIAIOSFODNN7EXAMPLE',
          '  # Another comment with ' + 'sk_live_' + '1234567890abcdefghijklmn',
          '',
          'SAFE_VAR=hello_world',
        ].join('\n')
      );

      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);
      watcher.stop();

      const secretEvents = events.filter((e) => e.category === 'credential-access');
      expect(secretEvents.length).toBe(0);
    });
  });

  describe('deduplication', () => {
    it('should not alert twice for the same secret on re-scan', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij\n');

      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);

      const countAfterFirstScan = events.filter((e) => e.category === 'credential-access').length;
      expect(countAfterFirstScan).toBe(1);

      // Trigger a re-scan by modifying the file with the same content
      fs.writeFileSync(envPath, 'GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij\n');
      await wait(500);
      watcher.stop();

      const countAfterRescan = events.filter((e) => e.category === 'credential-access').length;
      // Should still be 1 (no duplicate)
      expect(countAfterRescan).toBe(1);
    });
  });

  describe('new .env file creation', () => {
    it('should detect secrets when a new .env file is created', async () => {
      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);

      // Create a new .env.local file after watcher is running
      const newEnvPath = path.join(tempDir, '.env.local');
      const fakeStripe = 'sk_live_' + 'abcdefghijklmnopqrstuvwxyz1234';
      fs.writeFileSync(newEnvPath, `STRIPE_KEY=${fakeStripe}\n`);

      await wait(500);
      watcher.stop();

      const secretEvents = events.filter((e) => e.category === 'credential-access');
      expect(secretEvents.length).toBeGreaterThanOrEqual(1);

      const stripeEvent = secretEvents.find((e) => e.description.includes('Stripe Live Key'));
      expect(stripeEvent).toBeDefined();
    });

    it('should emit file-monitoring event for new .env file', async () => {
      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);

      const newEnvPath = path.join(tempDir, '.env.staging');
      fs.writeFileSync(newEnvPath, 'FOO=bar\n');

      await wait(500);
      watcher.stop();

      const fileEvents = events.filter((e) => e.category === 'file-monitoring');
      expect(fileEvents.length).toBeGreaterThanOrEqual(1);
      expect(fileEvents[0]!.severity).toBe('info');
      expect(fileEvents[0]!.description).toContain('.env.staging');
    });
  });

  describe('stop() cleanup', () => {
    it('should clean up all watchers on stop', async () => {
      await watcher.start();
      await wait(100);

      watcher.stop();

      // After stop, no new events should be emitted
      const events = collectEvents(watcher);
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'AKIAIOSFODNN7EXAMPLE\n');
      await wait(300);

      expect(events.length).toBe(0);
    });

    it('should be safe to call stop multiple times', () => {
      expect(() => {
        watcher.stop();
        watcher.stop();
      }).not.toThrow();
    });
  });

  describe('value redaction', () => {
    it('should redact secret values in event metadata', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'KEY=AKIAIOSFODNN7EXAMPLE\n');

      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);
      watcher.stop();

      const secretEvent = events.find((e) => e.category === 'credential-access');
      expect(secretEvent).toBeDefined();

      const redacted = secretEvent!.metadata['redactedValue'] as string;
      expect(redacted).toContain('...[REDACTED]');
      // Should show at most 8 chars before redaction
      expect(redacted).toMatch(/^.{1,8}\.\.\.\[REDACTED\]$/);
      // Should NOT contain the full key
      expect(redacted).not.toContain('AKIAIOSFODNN7EXAMPLE');
    });
  });

  describe('multiple secrets in one file', () => {
    it('should detect multiple different secrets', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(
        envPath,
        [
          'AWS_KEY=AKIAIOSFODNN7EXAMPLE',
          'STRIPE_KEY=' + 'sk_live_' + 'abcdefghijklmnopqrstuvwxyz1234',
          'DB_URL=postgres://admin:secret123@db.example.com:5432/prod',
        ].join('\n')
      );

      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);
      watcher.stop();

      const secretEvents = events.filter((e) => e.category === 'credential-access');
      expect(secretEvents.length).toBeGreaterThanOrEqual(3);

      const patternIds = secretEvents.map((e) => e.metadata['patternId']);
      expect(patternIds).toContain('aws-key');
      expect(patternIds).toContain('stripe-live');
      expect(patternIds).toContain('db-connection');
    });
  });

  describe('event format', () => {
    it('should emit SecurityEvent with correct structure', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij\n');

      const events = collectEvents(watcher);
      await watcher.start();
      await wait(200);
      watcher.stop();

      const event = events.find((e) => e.category === 'credential-access');
      expect(event).toBeDefined();
      expect(event!.id).toMatch(/^secret-/);
      expect(event!.timestamp).toBeInstanceOf(Date);
      expect(event!.source).toBe('file');
      expect(typeof event!.severity).toBe('string');
      expect(typeof event!.category).toBe('string');
      expect(typeof event!.description).toBe('string');
      expect(event!.raw).toBeDefined();
      expect(typeof event!.host).toBe('string');
      expect(event!.metadata['watcher']).toBe('secret-watcher');
    });
  });
});
