/**
 * Audit HMAC key management.
 *
 * The audit chain is signed with a per-machine HMAC key. We resolve it in two
 * tiers, generate-once + reuse:
 *   1. Keychain-first: the security-hardening credential store (service
 *      'panguard-audit'). On macOS/Linux/Windows this is the OS-protected store
 *      where available; otherwise it falls back to an AES-256-GCM encrypted file
 *      under ~/.panguard/credentials, keyed by machine entropy.
 *   2. Plain-file fallback: ~/.panguard/audit-key (randomBytes(32), dir 0700,
 *      file 0600) for environments where the credential store is unavailable.
 *
 * Mirrors the get-or-create discipline of threat-cloud/client-id.ts.
 *
 * @module @panguard-ai/panguard-guard/audit/audit-key
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createLogger } from '@panguard-ai/core';
import { EncryptedFileCredentialStore } from '@panguard-ai/security-hardening';

const logger = createLogger('panguard-guard:audit-key');

/** Credential-store service name for the audit key. */
const AUDIT_SERVICE = 'panguard-audit';
/** Credential-store account name. */
const AUDIT_ACCOUNT = 'hmac-key';
/** Key size in bytes (256-bit HMAC key). */
const KEY_BYTES = 32;

/** Directory holding panguard local secrets. */
const PANGUARD_DIR = join(homedir(), '.panguard');
/** Credential-store directory used by the keychain-first tier. */
const CRED_STORE_DIR = join(PANGUARD_DIR, 'credentials');
/**
 * Plain-file fallback path. Same-user-readable: an attacker running as THIS user
 * can read this key and recompute a consistent chain. This is tamper EVIDENCE,
 * not tamper PREVENTION — remote anchoring (publish chain head to Threat Cloud)
 * is the enterprise upgrade that closes the same-user gap. See SECURITY.md.
 */
const FALLBACK_KEY_PATH = join(PANGUARD_DIR, 'audit-key');

/** Cached key so repeated calls in one process don't re-read disk. */
let cachedKey: Buffer | null = null;

/**
 * Get (or generate-once and persist) the audit HMAC key.
 *
 * Never throws: if the keychain tier is unavailable it falls through to the
 * file fallback; if even the file cannot be persisted, an in-memory key is
 * returned so audit signing still works for the life of the process.
 */
export async function getAuditKey(): Promise<Buffer> {
  if (cachedKey) return cachedKey;

  // Tier 1: keychain-first via the credential store.
  const fromStore = await tryReadFromStore();
  if (fromStore) {
    cachedKey = fromStore;
    return fromStore;
  }

  // Tier 2: plain-file fallback (0700 dir / 0600 file).
  const fromFile = tryReadFromFile();
  if (fromFile) {
    cachedKey = fromFile;
    return fromFile;
  }

  // Generate once. Try to persist to the store first, then the file.
  const fresh = randomBytes(KEY_BYTES);
  const persistedToStore = await tryWriteToStore(fresh);
  if (!persistedToStore) {
    tryWriteToFile(fresh);
  }
  cachedKey = fresh;
  return fresh;
}

/** Read the key from the credential store, or null if absent/unavailable. */
async function tryReadFromStore(): Promise<Buffer | null> {
  try {
    const store = new EncryptedFileCredentialStore(CRED_STORE_DIR);
    const hex = await store.get(AUDIT_SERVICE, AUDIT_ACCOUNT);
    if (hex && /^[0-9a-f]+$/i.test(hex) && hex.length === KEY_BYTES * 2) {
      return Buffer.from(hex, 'hex');
    }
  } catch (err) {
    logger.warn(`Audit key store read unavailable: ${errMsg(err)}`);
  }
  return null;
}

/** Persist the key to the credential store. Returns true on success. */
async function tryWriteToStore(key: Buffer): Promise<boolean> {
  try {
    const store = new EncryptedFileCredentialStore(CRED_STORE_DIR);
    await store.set(AUDIT_SERVICE, AUDIT_ACCOUNT, key.toString('hex'));
    return true;
  } catch (err) {
    logger.warn(`Audit key store write unavailable: ${errMsg(err)}`);
    return false;
  }
}

/** Read the key from the plain-file fallback, or null if absent/invalid. */
function tryReadFromFile(): Buffer | null {
  try {
    if (!existsSync(FALLBACK_KEY_PATH)) return null;
    const hex = readFileSync(FALLBACK_KEY_PATH, 'utf-8').trim();
    if (hex && /^[0-9a-f]+$/i.test(hex) && hex.length === KEY_BYTES * 2) {
      return Buffer.from(hex, 'hex');
    }
  } catch (err) {
    logger.warn(`Audit key file read failed: ${errMsg(err)}`);
  }
  return null;
}

/** Persist the key to the plain-file fallback (0700 dir / 0600 file). */
function tryWriteToFile(key: Buffer): void {
  try {
    mkdirSync(PANGUARD_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(FALLBACK_KEY_PATH, key.toString('hex'), { mode: 0o600 });
  } catch (err) {
    logger.warn(`Audit key file persist failed (using in-memory key): ${errMsg(err)}`);
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Reset the in-process cache. Test-only seam. */
export function __resetAuditKeyCacheForTests(): void {
  cachedKey = null;
}
