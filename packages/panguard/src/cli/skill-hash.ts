/**
 * Hash of a skill directory for Threat Cloud and workspace sync.
 *
 * For a single file the hash is the content hash of that file. With a SKILL.md the hash is the content hash of that file (identical to the
 * website, which keeps Threat Cloud dedup working). Without one the directory
 * CONTENT is hashed (sorted relative paths + file bytes, bounded); the absolute
 * path of the directory is never an input.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { contentHash, directoryContentHash } from '@panguard-ai/scan-core';

export function computeSkillHash(skillDir: string): string {
  // A single file (for example one .md skill) is hashed by its content.
  try {
    if (statSync(skillDir).isFile()) return contentHash(readFileSync(skillDir, 'utf-8'));
  } catch {
    /* fall through to the directory handling */
  }
  const skillMdPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMdPath)) return directoryContentHash(skillDir);
  return contentHash(readFileSync(skillMdPath, 'utf-8'));
}
