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
  const skillPath = path.join(skillDir, 'SKILL.md');

  let content: string;
  try {
    const stat = await fs.stat(skillPath);
    if (stat.size > MAX_SKILL_SIZE) {
      return null;
    }
    content = await fs.readFile(skillPath, 'utf-8');
  } catch {
    return null;
  }

  return parseManifestFromString(content, path.basename(skillDir));
}
