/**
 * Collect the script files a skill ships next to SKILL.md, for the ATR scan.
 * 收集技能附帶的腳本檔，供 ATR 掃描。
 *
 * @module @panguard-ai/panguard-skill-auditor/bundled-scripts
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

/** Extensions of files an agent can run or import / 代理可執行或匯入的檔案副檔名 */
const SCRIPT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.py',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.mts',
  '.cts',
  '.sh',
  '.bash',
  '.zsh',
  '.ps1',
  '.rb',
  '.pl',
  '.php',
]);

/** Directories never read: dependencies, VCS, bytecode, build output */
const SKIPPED_DIRS: ReadonlySet<string> = new Set([
  '.git',
  'node_modules',
  '__pycache__',
  '.venv',
  'venv',
  'dist',
  'build',
]);

/** A single file larger than this is skipped / 超過此大小的單一檔案略過 */
export const MAX_SCRIPT_BYTES = 256 * 1024;

/** At most this many files are read per skill / 每個技能最多讀取的檔案數 */
export const MAX_SCRIPT_FILES = 200;

/** Directory depth limit, so a symlink loop or deep tree cannot stall the audit */
const MAX_DEPTH = 8;

export interface BundledScript {
  /** Path relative to the skill directory, with forward slashes */
  readonly path: string;
  readonly content: string;
}

/**
 * Read the script files under a skill directory.
 *
 * Returns nothing for a single-file skill (a path to a .md file), since there is
 * no directory of its own to read. Symbolic links are not followed.
 */
export async function collectBundledScripts(skillDir: string): Promise<BundledScript[]> {
  if (skillDir.endsWith('.md')) return [];
  try {
    if (!(await stat(skillDir)).isDirectory()) return [];
  } catch {
    return [];
  }
  const paths = await walk(skillDir, 0, []);
  const scripts: BundledScript[] = [];
  for (const full of paths) {
    try {
      const content = await readFile(full, 'utf8');
      scripts.push({ path: relative(skillDir, full).split(sep).join('/'), content });
    } catch {
      // Unreadable file: skip it rather than fail the audit
    }
  }
  return scripts;
}

async function walk(dir: string, depth: number, out: string[]): Promise<string[]> {
  if (depth > MAX_DEPTH || out.length >= MAX_SCRIPT_FILES) return out;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of sorted) {
    if (out.length >= MAX_SCRIPT_FILES) break;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) await walk(full, depth + 1, out);
    } else if (entry.isFile() && SCRIPT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      try {
        if ((await stat(full)).size <= MAX_SCRIPT_BYTES) out.push(full);
      } catch {
        // Vanished between readdir and stat: skip
      }
    }
  }
  return out;
}
