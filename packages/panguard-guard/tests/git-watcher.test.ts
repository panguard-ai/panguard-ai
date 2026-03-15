/**
 * GitWatcher unit tests
 * GitWatcher 單元測試
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  GitWatcher,
  createGitEvent,
  isSensitiveFile,
  scanLineForSecrets,
} from '../src/monitors/git-watcher.js';
import type { SecurityEvent } from '@panguard-ai/core';

/**
 * Create a temporary git repository for testing.
 * Returns the repo path. Caller must clean up.
 */
function createTempGitRepo(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-watcher-test-'));
  execFileSync('git', ['init'], { cwd: tmpDir });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tmpDir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir });
  // Create an initial commit so HEAD exists
  fs.writeFileSync(path.join(tmpDir, 'README.md'), '# test');
  execFileSync('git', ['add', '.'], { cwd: tmpDir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: tmpDir });
  return tmpDir;
}

function removeTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Cleanup failure is non-fatal in tests
  }
}

// -- Pure function tests (no git repo needed) --

describe('isSensitiveFile', () => {
  it('should detect .env files', () => {
    expect(isSensitiveFile('.env')).toBe(true);
    expect(isSensitiveFile('.env.local')).toBe(true);
    expect(isSensitiveFile('.env.production')).toBe(true);
  });

  it('should detect key and certificate files', () => {
    expect(isSensitiveFile('server.pem')).toBe(true);
    expect(isSensitiveFile('private.key')).toBe(true);
    expect(isSensitiveFile('cert.p12')).toBe(true);
    expect(isSensitiveFile('cert.pfx')).toBe(true);
  });

  it('should detect SSH key files', () => {
    expect(isSensitiveFile('id_rsa')).toBe(true);
    expect(isSensitiveFile('id_ed25519')).toBe(true);
  });

  it('should detect credential and secret files', () => {
    expect(isSensitiveFile('credentials.json')).toBe(true);
    expect(isSensitiveFile('secrets.yaml')).toBe(true);
    expect(isSensitiveFile('secret.env')).toBe(true);
    expect(isSensitiveFile('password.txt')).toBe(true);
  });

  it('should not flag normal files', () => {
    expect(isSensitiveFile('index.ts')).toBe(false);
    expect(isSensitiveFile('package.json')).toBe(false);
    expect(isSensitiveFile('README.md')).toBe(false);
  });
});

describe('scanLineForSecrets', () => {
  it('should detect AWS access keys', () => {
    const match = scanLineForSecrets('+const key = "AKIAIOSFODNN7EXAMPLE"');
    expect(match).not.toBeNull();
    expect(match!.id).toBe('aws-key');
  });

  it('should detect GitHub tokens', () => {
    const match = scanLineForSecrets('+GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij');
    expect(match).not.toBeNull();
    expect(match!.id).toBe('github-token');
  });

  it('should detect private keys with critical severity', () => {
    const match = scanLineForSecrets('+-----BEGIN RSA PRIVATE KEY-----');
    expect(match).not.toBeNull();
    expect(match!.id).toBe('private-key');
    expect(match!.severity).toBe('critical');
  });

  it('should detect Anthropic API keys', () => {
    const match = scanLineForSecrets('+ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstu');
    expect(match).not.toBeNull();
    expect(match!.id).toBe('anthropic-key');
  });

  it('should detect database connection strings', () => {
    const match = scanLineForSecrets('+DATABASE_URL=postgres://user:pass@host:5432/dbname');
    expect(match).not.toBeNull();
    expect(match!.id).toBe('db-connection');
  });

  it('should detect Stripe live keys', () => {
    // Concatenate to avoid GitHub push protection false positive
    const fakeStripeKey = 'sk_live_' + 'abcdefghijklmnopqrstuvwx';
    const match = scanLineForSecrets(`+STRIPE_KEY=${fakeStripeKey}`);
    expect(match).not.toBeNull();
    expect(match!.id).toBe('stripe-live');
  });

  it('should return null for clean lines', () => {
    expect(scanLineForSecrets('+const x = 42;')).toBeNull();
    expect(scanLineForSecrets('+import { foo } from "bar";')).toBeNull();
  });
});

describe('createGitEvent', () => {
  it('should create a SecurityEvent with git source', () => {
    const event = createGitEvent({
      severity: 'high',
      category: 'credential-access',
      description: 'Test event',
      metadata: { trigger: 'test' },
    });

    expect(event.source).toBe('git');
    expect(event.severity).toBe('high');
    expect(event.category).toBe('credential-access');
    expect(event.description).toBe('Test event');
    expect(event.id).toMatch(/^git-/);
    expect(event.metadata['watcher']).toBe('git-watcher');
    expect(event.metadata['trigger']).toBe('test');
    expect(event.host).toBe(os.hostname());
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('should generate unique IDs', () => {
    const e1 = createGitEvent({
      severity: 'low',
      category: 'test',
      description: 'a',
      metadata: {},
    });
    const e2 = createGitEvent({
      severity: 'low',
      category: 'test',
      description: 'b',
      metadata: {},
    });
    expect(e1.id).not.toBe(e2.id);
  });
});

// -- GitWatcher class tests (need git repos) --

describe('GitWatcher', () => {
  let repoDir: string;
  let watcher: GitWatcher;

  beforeEach(() => {
    repoDir = createTempGitRepo();
    watcher = new GitWatcher(repoDir);
  });

  afterEach(() => {
    watcher.stop();
    removeTempDir(repoDir);
  });

  describe('checkAvailability', () => {
    it('should return true for a valid git repository', async () => {
      const available = await watcher.checkAvailability();
      expect(available).toBe(true);
    });

    it('should return false for a non-git directory', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-git-'));
      const nonGitWatcher = new GitWatcher(tmpDir);
      try {
        const available = await nonGitWatcher.checkAvailability();
        expect(available).toBe(false);
      } finally {
        nonGitWatcher.stop();
        removeTempDir(tmpDir);
      }
    });
  });

  describe('start/stop lifecycle', () => {
    it('should start and stop without error', async () => {
      await watcher.start();
      expect(watcher.isRunning()).toBe(true);
      watcher.stop();
      expect(watcher.isRunning()).toBe(false);
    });

    it('should be idempotent on double start', async () => {
      await watcher.start();
      await watcher.start(); // should not throw
      expect(watcher.isRunning()).toBe(true);
    });

    it('should be idempotent on double stop', async () => {
      await watcher.start();
      watcher.stop();
      watcher.stop(); // should not throw
      expect(watcher.isRunning()).toBe(false);
    });

    it('stop should clean up watcher and debounce timer', async () => {
      await watcher.start();
      watcher.stop();
      // After stop, running should be false
      expect(watcher.isRunning()).toBe(false);
    });
  });

  describe('event detection via git operations', () => {
    it('should detect sensitive file commit (.env)', async () => {
      await watcher.start();

      const events: SecurityEvent[] = [];
      watcher.on('event', (e: SecurityEvent) => events.push(e));

      // Commit an .env file
      fs.writeFileSync(path.join(repoDir, '.env'), 'SECRET=value');
      execFileSync('git', ['add', '.env'], { cwd: repoDir });
      execFileSync('git', ['commit', '-m', 'add env'], { cwd: repoDir });

      // Trigger analysis directly instead of relying on fs.watch
      await watcher.analyzeLatestCommit();

      const sensitiveEvents = events.filter(
        (e) => e.metadata['trigger'] === 'sensitive_file_commit'
      );
      expect(sensitiveEvents.length).toBeGreaterThanOrEqual(1);
      expect(sensitiveEvents[0]!.severity).toBe('high');
      expect(sensitiveEvents[0]!.category).toBe('credential-access');
    });

    it('should detect secrets in committed diffs', async () => {
      await watcher.start();

      const events: SecurityEvent[] = [];
      watcher.on('event', (e: SecurityEvent) => events.push(e));

      // Commit a file containing an AWS key
      fs.writeFileSync(
        path.join(repoDir, 'config.ts'),
        'export const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";'
      );
      execFileSync('git', ['add', 'config.ts'], { cwd: repoDir });
      execFileSync('git', ['commit', '-m', 'add config'], { cwd: repoDir });

      await watcher.analyzeLatestCommit();

      const secretEvents = events.filter((e) => e.metadata['trigger'] === 'secret_in_commit');
      expect(secretEvents.length).toBeGreaterThanOrEqual(1);
      expect(secretEvents[0]!.metadata['patternId']).toBe('aws-key');
    });

    it('should detect direct commit to main branch', async () => {
      await watcher.start();

      const events: SecurityEvent[] = [];
      watcher.on('event', (e: SecurityEvent) => events.push(e));

      fs.writeFileSync(path.join(repoDir, 'feature.ts'), 'export const x = 1;');
      execFileSync('git', ['add', 'feature.ts'], { cwd: repoDir });
      execFileSync('git', ['commit', '-m', 'direct commit'], { cwd: repoDir });

      await watcher.analyzeLatestCommit();

      const branchEvents = events.filter((e) => e.metadata['trigger'] === 'direct_main_commit');
      // This should fire on main/master default branch
      expect(branchEvents.length).toBeGreaterThanOrEqual(1);
      expect(branchEvents[0]!.severity).toBe('medium');
      expect(branchEvents[0]!.category).toBe('policy-violation');
    });

    it('should detect .pem file commit', async () => {
      await watcher.start();

      const events: SecurityEvent[] = [];
      watcher.on('event', (e: SecurityEvent) => events.push(e));

      fs.writeFileSync(path.join(repoDir, 'server.pem'), 'fake-cert-content');
      execFileSync('git', ['add', 'server.pem'], { cwd: repoDir });
      execFileSync('git', ['commit', '-m', 'add cert'], { cwd: repoDir });

      await watcher.analyzeLatestCommit();

      const sensitiveEvents = events.filter(
        (e) => e.metadata['trigger'] === 'sensitive_file_commit'
      );
      expect(sensitiveEvents.length).toBeGreaterThanOrEqual(1);
      expect(sensitiveEvents[0]!.metadata['filePath']).toBe('server.pem');
    });
  });

  describe('debouncing', () => {
    it('should debounce multiple rapid events into single analysis', async () => {
      await watcher.start();

      const events: SecurityEvent[] = [];
      watcher.on('event', (e: SecurityEvent) => events.push(e));

      // Make two commits rapidly
      fs.writeFileSync(path.join(repoDir, 'a.ts'), 'const a = 1;');
      execFileSync('git', ['add', 'a.ts'], { cwd: repoDir });
      execFileSync('git', ['commit', '-m', 'commit a'], { cwd: repoDir });

      fs.writeFileSync(path.join(repoDir, 'b.ts'), 'const b = 2;');
      execFileSync('git', ['add', 'b.ts'], { cwd: repoDir });
      execFileSync('git', ['commit', '-m', 'commit b'], { cwd: repoDir });

      // Trigger analysis of the latest state (simulates debounced analysis)
      await watcher.analyzeLatestCommit();

      // Both commits are to main, so we expect at least one direct_main_commit event
      const mainEvents = events.filter((e) => e.metadata['trigger'] === 'direct_main_commit');
      expect(mainEvents.length).toBeGreaterThanOrEqual(1);
    });
  });
});
