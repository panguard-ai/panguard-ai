/**
 * Anonymous Client ID for Threat Cloud deduplication.
 * Reads or creates a UUID at ~/.panguard/client-id.
 * Not associated with any user account or email.
 *
 * @module @openclaw/panguard-guard/threat-cloud/client-id
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const ID_PATH = join(homedir(), '.panguard', 'client-id');

/**
 * Get or create an anonymous client ID for deduplication.
 * This ID is a random UUID, not linked to user identity.
 */
export function getAnonymousClientId(): string {
  try {
    if (existsSync(ID_PATH)) {
      const id = readFileSync(ID_PATH, 'utf-8').trim();
      if (id.length > 0) return id;
    }
  } catch {
    // Fall through to create
  }

  const id = randomUUID();
  try {
    mkdirSync(join(homedir(), '.panguard'), { recursive: true });
    writeFileSync(ID_PATH, id, 'utf-8');
  } catch {
    // Best effort - return the ID even if we can't persist it
  }
  return id;
}
