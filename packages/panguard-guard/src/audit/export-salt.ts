/**
 * Per-install export salt for audit anonymization.
 *
 * The exported audit document replaces the OS username with an HMAC so an auditor
 * can correlate same-user records ACROSS the exported set WITHOUT being able to
 * brute-force the low-entropy username back out. A plain SHA-256 of the username
 * cannot achieve that: usernames are extremely low-entropy ('admin', 'ubuntu', a
 * real name, an LDAP handle) and a fixed domain-separator digest is one wordlist
 * away from reversal, with a single precomputed table working for every install.
 *
 * The fix is a secret the auditor never receives: a random per-install salt kept
 * ONLY in the local data dir (0700 dir / 0600 file) and NEVER included in any
 * export. user_hash = HMAC-SHA256(localSalt, username). Correlatable within one
 * install's documents; not brute-forceable without the never-exported salt.
 *
 * Same get-or-create-once discipline as audit-key.ts. Never throws: if the salt
 * cannot be persisted, an in-memory salt is used for the life of the process
 * (still non-reversible; it just does not persist across restarts).
 *
 * @module @panguard-ai/panguard-guard/audit/export-salt
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';

/** Directory holding panguard local secrets (mirrors audit-key.ts). */
const PANGUARD_DIR = join(homedir(), '.panguard');
/** Local-only salt file. Never exported. */
const SALT_PATH = join(PANGUARD_DIR, 'export-salt');
/** Salt size in bytes (256-bit). */
const SALT_BYTES = 32;

/** Cached salt so repeated exports in one process do not re-read disk. */
let cachedSalt: Buffer | null = null;

/**
 * Get (or generate-once and persist) the local-only export salt.
 *
 * Synchronous by design so the export anonymizer can stay synchronous. Never
 * throws: an unwritable data dir falls back to an in-memory salt.
 */
export function getExportSalt(): Buffer {
  if (cachedSalt) return cachedSalt;

  const fromFile = tryReadSalt();
  if (fromFile) {
    cachedSalt = fromFile;
    return fromFile;
  }

  const fresh = randomBytes(SALT_BYTES);
  tryWriteSalt(fresh);
  cachedSalt = fresh;
  return fresh;
}

function tryReadSalt(): Buffer | null {
  try {
    if (!existsSync(SALT_PATH)) return null;
    const hex = readFileSync(SALT_PATH, 'utf-8').trim();
    if (hex && /^[0-9a-f]+$/i.test(hex) && hex.length === SALT_BYTES * 2) {
      return Buffer.from(hex, 'hex');
    }
  } catch {
    /* fall through to regenerate / in-memory */
  }
  return null;
}

function tryWriteSalt(salt: Buffer): void {
  try {
    mkdirSync(PANGUARD_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(SALT_PATH, salt.toString('hex'), { mode: 0o600 });
  } catch {
    /* in-memory salt for the life of the process */
  }
}

/** Reset the in-process cache. Test-only seam. */
export function __resetExportSaltCacheForTests(): void {
  cachedSalt = null;
}
