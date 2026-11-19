/**
 * Hash of a skill directory for Threat Cloud and workspace sync.
 *
 * With a SKILL.md the hash is the content hash of that file (identical to the
 * website, which keeps Threat Cloud dedup working). Without one the directory
 * CONTENT is hashed (sorted relative paths + file bytes, bounded); the absolute
 * path of the directory is never an input.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentHash, directoryContentHash } from '@panguard-ai/scan-core';

export function computeSkillHash(skillDir: string): string {
  const skillMdPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMdPath)) return directoryContentHash(skillDir);
  return contentHash(readFileSync(skillMdPath, 'utf-8'));
}
