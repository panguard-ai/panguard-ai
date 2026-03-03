import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  InMemoryCredentialStore,
  EncryptedFileCredentialStore,
} from '../src/credentials/credential-store.js';
import { scanPlaintextCredentials, migrateCredentials } from '../src/credentials/migration.js';

// ---------------------------------------------------------------------------
// InMemoryCredentialStore
// ---------------------------------------------------------------------------
describe('InMemoryCredentialStore', () => {
  let store: InMemoryCredentialStore;

  beforeEach(() => {
    store = new InMemoryCredentialStore();
  });

  it('should store and retrieve credentials', async () => {
    await store.set('telegram', 'bot', 'my-secret-token');
    const result = await store.get('telegram', 'bot');
    expect(result).toBe('my-secret-token');
  });

  it('should return null for non-existent credentials', async () => {
    const result = await store.get('nonexistent', 'account');
    expect(result).toBeNull();
  });

  it('should delete credentials and return true', async () => {
    await store.set('slack', 'default', 'slack-token');
    expect(await store.delete('slack', 'default')).toBe(true);
    expect(await store.get('slack', 'default')).toBeNull();
  });

  it('should return false when deleting non-existent credentials', async () => {
    const result = await store.delete('nonexistent', 'account');
    expect(result).toBe(false);
  });

  it('should list accounts for a service', async () => {
    await store.set('openai', 'key1', 'value1');
    await store.set('openai', 'key2', 'value2');
    await store.set('claude', 'key1', 'value3');
    const accounts = await store.list('openai');
    expect(accounts).toHaveLength(2);
    expect(accounts).toContain('key1');
    expect(accounts).toContain('key2');
  });

  it('should return empty array when listing non-existent service', async () => {
    const accounts = await store.list('nonexistent');
    expect(accounts).toHaveLength(0);
  });

  it('should overwrite existing credentials', async () => {
    await store.set('telegram', 'bot', 'old-token');
    await store.set('telegram', 'bot', 'new-token');
    expect(await store.get('telegram', 'bot')).toBe('new-token');
  });

  it('should isolate credentials by service', async () => {
    await store.set('serviceA', 'account', 'valueA');
    await store.set('serviceB', 'account', 'valueB');
    expect(await store.get('serviceA', 'account')).toBe('valueA');
    expect(await store.get('serviceB', 'account')).toBe('valueB');
  });

  it('should handle empty string values', async () => {
    await store.set('service', 'account', '');
    // Empty string is a valid value (not null)
    expect(await store.get('service', 'account')).toBe('');
  });

  it('should handle special characters in service and account names', async () => {
    await store.set('my-service.v2', 'user@example.com', 'secret');
    expect(await store.get('my-service.v2', 'user@example.com')).toBe('secret');
  });
});

// ---------------------------------------------------------------------------
// EncryptedFileCredentialStore
// ---------------------------------------------------------------------------
describe('EncryptedFileCredentialStore', () => {
  let storePath: string;
  let store: EncryptedFileCredentialStore;

  beforeEach(() => {
    storePath = join(tmpdir(), `panguard-test-creds-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    store = new EncryptedFileCredentialStore(storePath);
  });

  afterEach(() => {
    if (existsSync(storePath)) {
      rmSync(storePath, { recursive: true });
    }
  });

  it('should create store directory on construction', () => {
    expect(existsSync(storePath)).toBe(true);
  });

  it('should store and retrieve encrypted credentials', async () => {
    await store.set('telegram', 'bot', 'encrypted-secret');
    const result = await store.get('telegram', 'bot');
    expect(result).toBe('encrypted-secret');
  });

  it('should create encrypted files (not plaintext)', async () => {
    await store.set('openai', 'default', 'sk-1234567890');
    const files = readdirSync(storePath) as string[];
    expect(files.some((f: string) => f.endsWith('.enc'))).toBe(true);

    // Verify the file content is NOT the plaintext secret
    const encFile = files.find((f: string) => f.endsWith('.enc'));
    if (encFile) {
      const content = readFileSync(join(storePath, encFile), 'utf-8');
      expect(content).not.toContain('sk-1234567890');
      // Should look like base64 data separated by colons (iv:authTag:encrypted)
      expect(content.split(':')).toHaveLength(3);
    }
  });

  it('should handle multiple accounts per service', async () => {
    await store.set('api', 'prod', 'prod-key');
    await store.set('api', 'dev', 'dev-key');
    expect(await store.get('api', 'prod')).toBe('prod-key');
    expect(await store.get('api', 'dev')).toBe('dev-key');
  });

  it('should delete single account and keep others', async () => {
    await store.set('api', 'account1', 'value1');
    await store.set('api', 'account2', 'value2');
    expect(await store.delete('api', 'account1')).toBe(true);
    expect(await store.get('api', 'account1')).toBeNull();
    expect(await store.get('api', 'account2')).toBe('value2');
  });

  it('should delete the file when last account is removed', async () => {
    await store.set('single-service', 'only-account', 'value');
    await store.delete('single-service', 'only-account');

    // The .enc file should be gone after deleting the last account
    const files = readdirSync(storePath);
    const serviceFile = files.find((f) => f.startsWith('single-service'));
    expect(serviceFile).toBeUndefined();
  });

  it('should return false when deleting non-existent account', async () => {
    const result = await store.delete('nonexistent', 'account');
    expect(result).toBe(false);
  });

  it('should return null for non-existent credential', async () => {
    const result = await store.get('nonexistent', 'account');
    expect(result).toBeNull();
  });

  it('should list all accounts for a service', async () => {
    await store.set('multi', 'a', 'val-a');
    await store.set('multi', 'b', 'val-b');
    await store.set('multi', 'c', 'val-c');
    const accounts = await store.list('multi');
    expect(accounts).toHaveLength(3);
    expect(accounts.sort()).toEqual(['a', 'b', 'c']);
  });

  it('should return empty array when listing non-existent service', async () => {
    const accounts = await store.list('nonexistent');
    expect(accounts).toHaveLength(0);
  });

  it('should sanitize service names for filesystem safety', async () => {
    await store.set('my/service.special!chars', 'account', 'value');
    const result = await store.get('my/service.special!chars', 'account');
    expect(result).toBe('value');

    // Verify the filename is sanitized (no slashes or special chars)
    const files = readdirSync(storePath);
    for (const f of files) {
      expect(f).not.toContain('/');
      expect(f).not.toContain('!');
    }
  });

  it('should overwrite existing credentials', async () => {
    await store.set('service', 'account', 'old-value');
    await store.set('service', 'account', 'new-value');
    expect(await store.get('service', 'account')).toBe('new-value');
  });

  it('should handle corrupt encrypted file gracefully', async () => {
    // Write a corrupt file manually
    const corruptPath = join(storePath, 'corrupt_service.enc');
    writeFileSync(corruptPath, 'not-valid-encrypted-data');

    // Should return null rather than crash
    const result = await store.get('corrupt_service', 'account');
    expect(result).toBeNull();
  });

  it('should persist across store instances', async () => {
    await store.set('persistent', 'account', 'persisted-value');

    // Create a new store instance pointing to the same directory
    const store2 = new EncryptedFileCredentialStore(storePath);
    const result = await store2.get('persistent', 'account');
    expect(result).toBe('persisted-value');
  });

  it('should handle not re-creating an existing directory', () => {
    // Creating another store pointing to the same existing dir should not throw
    expect(() => new EncryptedFileCredentialStore(storePath)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Plaintext Credential Scanner
// ---------------------------------------------------------------------------
describe('Plaintext Credential Scanner', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `panguard-test-scan-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should detect plaintext credential files', () => {
    writeFileSync(join(testDir, 'telegram.token'), 'bot-token-123');
    writeFileSync(join(testDir, 'openai.key'), 'sk-abcdef');
    const found = scanPlaintextCredentials(testDir);
    expect(found.length).toBe(2);
    expect(found.map((c) => c.service)).toContain('telegram');
    expect(found.map((c) => c.service)).toContain('openai');
  });

  it('should return empty array for non-existent directory', () => {
    const found = scanPlaintextCredentials('/nonexistent/path');
    expect(found).toHaveLength(0);
  });

  it('should skip backup files', () => {
    writeFileSync(join(testDir, 'telegram.token.backup'), 'old-token');
    const found = scanPlaintextCredentials(testDir);
    expect(found).toHaveLength(0);
  });

  it('should skip encrypted files', () => {
    writeFileSync(join(testDir, 'slack.enc'), 'encrypted-data');
    const found = scanPlaintextCredentials(testDir);
    expect(found).toHaveLength(0);
  });

  it('should skip hidden files', () => {
    writeFileSync(join(testDir, '.telegram.token'), 'hidden-token');
    const found = scanPlaintextCredentials(testDir);
    expect(found).toHaveLength(0);
  });

  it('should skip empty credential files', () => {
    writeFileSync(join(testDir, 'telegram.token'), '');
    const found = scanPlaintextCredentials(testDir);
    expect(found).toHaveLength(0);
  });

  it('should skip whitespace-only credential files', () => {
    writeFileSync(join(testDir, 'telegram.token'), '   \n  ');
    const found = scanPlaintextCredentials(testDir);
    expect(found).toHaveLength(0);
  });

  it('should detect all known credential patterns', () => {
    writeFileSync(join(testDir, 'telegram_token'), 'tg-token');
    writeFileSync(join(testDir, 'slack-token'), 'slack-token');
    writeFileSync(join(testDir, 'discord.token'), 'discord-token');
    writeFileSync(join(testDir, 'openai.key'), 'openai-key');
    writeFileSync(join(testDir, 'claude_key'), 'claude-key');
    writeFileSync(join(testDir, 'line-token'), 'line-token');
    writeFileSync(join(testDir, 'whatsapp.token'), 'wa-token');
    writeFileSync(join(testDir, 'signal_token'), 'signal-token');

    const found = scanPlaintextCredentials(testDir);
    expect(found.length).toBe(8);

    const services = found.map((c) => c.service).sort();
    expect(services).toEqual([
      'claude',
      'discord',
      'line',
      'openai',
      'signal',
      'slack',
      'telegram',
      'whatsapp',
    ]);
  });

  it('should include file path and credential value in results', () => {
    writeFileSync(join(testDir, 'telegram.token'), 'my-bot-token-123');
    const found = scanPlaintextCredentials(testDir);
    expect(found).toHaveLength(1);
    expect(found[0]!.value).toBe('my-bot-token-123');
    expect(found[0]!.filePath).toBe(join(testDir, 'telegram.token'));
    expect(found[0]!.service).toBe('telegram');
    expect(found[0]!.account).toBe('bot');
  });

  it('should ignore unrecognized files', () => {
    writeFileSync(join(testDir, 'readme.txt'), 'nothing here');
    writeFileSync(join(testDir, 'config.json'), '{}');
    writeFileSync(join(testDir, 'random_file'), 'data');
    const found = scanPlaintextCredentials(testDir);
    expect(found).toHaveLength(0);
  });

  it('should trim whitespace from credential values', () => {
    writeFileSync(join(testDir, 'telegram.token'), '  trimmed-token  \n');
    const found = scanPlaintextCredentials(testDir);
    expect(found).toHaveLength(1);
    expect(found[0]!.value).toBe('trimmed-token');
  });
});

// ---------------------------------------------------------------------------
// Credential Migration
// ---------------------------------------------------------------------------
describe('Credential Migration', () => {
  let testDir: string;
  let store: InMemoryCredentialStore;

  beforeEach(() => {
    testDir = join(tmpdir(), `panguard-test-migrate-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    store = new InMemoryCredentialStore();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should migrate plaintext credentials to secure store', async () => {
    writeFileSync(join(testDir, 'discord.token'), 'discord-bot-token');
    const report = await migrateCredentials(store, testDir);
    expect(report.migrated).toBe(1);
    expect(report.failed).toBe(0);
    expect(await store.get('discord', 'bot')).toBe('discord-bot-token');
  });

  it('should create backup of original files after migration', async () => {
    writeFileSync(join(testDir, 'slack.token'), 'slack-token');
    await migrateCredentials(store, testDir);
    expect(existsSync(join(testDir, 'slack.token.backup'))).toBe(true);
    expect(existsSync(join(testDir, 'slack.token'))).toBe(false);
  });

  it('should handle dry run without migrating', async () => {
    writeFileSync(join(testDir, 'line.token'), 'line-token');
    const report = await migrateCredentials(store, testDir, true);
    expect(report.migrated).toBe(1);
    // In dry run, original file still exists
    expect(existsSync(join(testDir, 'line.token'))).toBe(true);
    // And credential not stored
    expect(await store.get('line', 'default')).toBeNull();
  });

  it('should report zero for non-existent directory', async () => {
    const report = await migrateCredentials(store, '/nonexistent/migrate');
    expect(report.scanned).toBe(0);
    expect(report.migrated).toBe(0);
    expect(report.failed).toBe(0);
    expect(report.errors).toHaveLength(0);
  });

  it('should report zero when no credentials found', async () => {
    const report = await migrateCredentials(store, testDir);
    expect(report.scanned).toBe(0);
    expect(report.migrated).toBe(0);
  });

  it('should migrate multiple credentials', async () => {
    writeFileSync(join(testDir, 'telegram.token'), 'tg-token');
    writeFileSync(join(testDir, 'openai.key'), 'openai-key');
    writeFileSync(join(testDir, 'discord.token'), 'dc-token');

    const report = await migrateCredentials(store, testDir);
    expect(report.scanned).toBe(3);
    expect(report.migrated).toBe(3);
    expect(report.failed).toBe(0);

    expect(await store.get('telegram', 'bot')).toBe('tg-token');
    expect(await store.get('openai', 'default')).toBe('openai-key');
    expect(await store.get('discord', 'bot')).toBe('dc-token');
  });

  it('should handle store.set failure gracefully', async () => {
    writeFileSync(join(testDir, 'telegram.token'), 'tg-token');

    // Create a store that always fails on set
    const failingStore: InMemoryCredentialStore = {
      ...store,
      set: async () => {
        throw new Error('Storage failure');
      },
      get: store.get.bind(store),
      delete: store.delete.bind(store),
      list: store.list.bind(store),
    };

    const report = await migrateCredentials(failingStore, testDir);
    expect(report.failed).toBe(1);
    expect(report.migrated).toBe(0);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toContain('Storage failure');
  });
});
