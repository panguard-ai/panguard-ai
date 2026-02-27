/**
 * Platform-agnostic secure credential storage
 * 平台無關的安全憑證儲存
 *
 * Provides encrypted credential storage using AES-256-GCM.
 * No native dependencies required (unlike keytar).
 * 使用 AES-256-GCM 提供加密憑證儲存。不需要原生相依套件。
 *
 * @module @panguard-ai/security-hardening/credentials/credential-store
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { hostname, userInfo } from 'os';
import { createLogger } from '@panguard-ai/core';
import type { CredentialStore } from '../types.js';

const logger = createLogger('credentials:store');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Derive an encryption key from machine-specific entropy
 * 從機器特定的熵值衍生加密金鑰
 *
 * @param salt - Additional salt / 額外鹽值
 * @returns 32-byte key / 32 位元組金鑰
 */
function deriveKey(salt: string): Buffer {
  const machineId = `${hostname()}-${userInfo().username}-panguard-ai`;
  return createHash('sha256').update(`${machineId}:${salt}`).digest();
}

/**
 * Encrypt a string value
 * 加密字串值
 */
function encrypt(value: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt an encrypted string
 * 解密已加密的字串
 */
function decrypt(encryptedData: string, key: Buffer): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  const [ivStr, authTagStr, dataStr] = parts;
  if (!ivStr || !authTagStr || !dataStr) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivStr, 'base64');
  const authTag = Buffer.from(authTagStr, 'base64');
  const encrypted = Buffer.from(dataStr, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * In-memory credential store for testing
 * 記憶體內憑證儲存（用於測試）
 */
export class InMemoryCredentialStore implements CredentialStore {
  private readonly store = new Map<string, string>();

  private key(service: string, account: string): string {
    return `${service}:${account}`;
  }

  async get(service: string, account: string): Promise<string | null> {
    return this.store.get(this.key(service, account)) ?? null;
  }

  async set(service: string, account: string, password: string): Promise<void> {
    this.store.set(this.key(service, account), password);
  }

  async delete(service: string, account: string): Promise<boolean> {
    return this.store.delete(this.key(service, account));
  }

  async list(service: string): Promise<string[]> {
    const prefix = `${service}:`;
    const accounts: string[] = [];
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) {
        accounts.push(k.slice(prefix.length));
      }
    }
    return accounts;
  }
}

/**
 * Encrypted file-based credential store
 * 基於加密檔案的憑證儲存
 *
 * Stores credentials in encrypted JSON files using AES-256-GCM.
 * Key is derived from machine-specific entropy (hostname + username).
 * 使用 AES-256-GCM 將憑證儲存在加密的 JSON 檔案中。
 * 金鑰從機器特定的熵值衍生（主機名稱 + 使用者名稱）。
 */
export class EncryptedFileCredentialStore implements CredentialStore {
  private readonly storePath: string;
  private readonly key: Buffer;

  /**
   * Create a new encrypted file credential store
   * 建立新的加密檔案憑證儲存
   *
   * @param storePath - Directory to store encrypted credentials / 儲存加密憑證的目錄
   */
  constructor(storePath: string) {
    this.storePath = storePath;
    this.key = deriveKey('credential-store-v1');

    if (!existsSync(storePath)) {
      mkdirSync(storePath, { recursive: true, mode: 0o700 });
      logger.info('Credential store directory created', { path: storePath });
    }
  }

  private filePath(service: string): string {
    // Sanitize service name for filesystem
    const safe = service.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.storePath, `${safe}.enc`);
  }

  private loadServiceData(service: string): Record<string, string> {
    const path = this.filePath(service);
    if (!existsSync(path)) {
      return {};
    }
    try {
      const encrypted = readFileSync(path, 'utf-8');
      const json = decrypt(encrypted, this.key);
      return JSON.parse(json) as Record<string, string>;
    } catch (error) {
      logger.error('Failed to load credential file', { service, error: String(error) });
      return {};
    }
  }

  private saveServiceData(service: string, data: Record<string, string>): void {
    const path = this.filePath(service);
    const json = JSON.stringify(data);
    const encrypted = encrypt(json, this.key);
    writeFileSync(path, encrypted, { mode: 0o600 });
  }

  async get(service: string, account: string): Promise<string | null> {
    const data = this.loadServiceData(service);
    const value = data[account];
    if (value !== undefined) {
      logger.info('Credential retrieved', { service, account });
      return value;
    }
    logger.warn('Credential not found', { service, account });
    return null;
  }

  async set(service: string, account: string, password: string): Promise<void> {
    const data = this.loadServiceData(service);
    data[account] = password;
    this.saveServiceData(service, data);
    logger.info('Credential stored securely', { service, account });
  }

  async delete(service: string, account: string): Promise<boolean> {
    const data = this.loadServiceData(service);
    if (!(account in data)) {
      return false;
    }
    delete data[account];
    if (Object.keys(data).length === 0) {
      const path = this.filePath(service);
      if (existsSync(path)) {
        unlinkSync(path);
      }
    } else {
      this.saveServiceData(service, data);
    }
    logger.info('Credential deleted', { service, account });
    return true;
  }

  async list(service: string): Promise<string[]> {
    const data = this.loadServiceData(service);
    return Object.keys(data);
  }
}
