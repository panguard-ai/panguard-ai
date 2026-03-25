/**
 * SKILL.md manifest parser (filesystem wrapper)
 *
 * Reads SKILL.md from disk and delegates to scan-core's string-based parser.
 *
 * @module @panguard-ai/panguard-skill-auditor/manifest-parser
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseManifestFromString } from '@panguard-ai/scan-core';
import type { SkillManifest } from './types.js';

const MAX_SKILL_SIZE = 1024 * 1024; // 1 MB

/**
 * Parse a SKILL.md file and extract manifest + instructions.
 */
export async function parseSkillManifest(skillDir: string): Promise<SkillManifest | null> {
  // Support both directory paths (with SKILL.md inside) and direct .md file paths
  const isFile = skillDir.endsWith('.md');
  const candidates = isFile
    ? [skillDir]
    : [path.join(skillDir, 'SKILL.md'), path.join(skillDir, 'skill.md')];

  let content: string | null = null;
  let resolvedPath = skillDir;

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile() && stat.size <= MAX_SKILL_SIZE) {
        content = await fs.readFile(candidate, 'utf-8');
        resolvedPath = candidate;
        break;
      }
    } catch {
      // Try next candidate
    }
  }

  if (!content) return null;

  const name = isFile ? path.basename(skillDir, '.md') : path.basename(skillDir);
  return parseManifestFromString(content, name);
}
