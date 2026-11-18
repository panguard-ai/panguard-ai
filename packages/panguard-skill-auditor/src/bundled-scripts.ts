/**
 * Collect the script files a skill ships next to SKILL.md, for the ATR scan.
 * 收集技能附帶的腳本檔，供 ATR 掃描。
 *
 * Every limit that drops a file is counted in `skipped`, so the caller can
 * report a scan that did not see everything instead of calling it clean.
 *
 * @module @panguard-ai/panguard-skill-auditor/bundled-scripts
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

/** Extensions of files an agent can run or import / 代理可執行或匯入的檔案副檔名 */
const SCRIPT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.py',
  '.pyw',
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
  '.psm1',
  '.bat',
  '.cmd',
  '.vbs',
  '.rb',
  '.pl',
  '.php',
]);

/**
 * Directories never read: third-party dependencies, VCS data and bytecode
 * (`.pyc` files are reported by the code check's compiled-artifact scan).
 */
const SKIPPED_DIRS: ReadonlySet<string> = new Set([
  '.git',
  'node_modules',
  '__pycache__',
  '.venv',
  'venv',
  'site-packages',
  'vendor',
]);

/** Top-level directories read first, so a pile of other files cannot push them past the cap */
const PRIORITY_DIRS: readonly string[] = ['scripts', 'bin', 'hooks', 'src', 'lib'];

/**
 * Build and test output, read last at the top level. A skill can tell the agent
 * to run what is in dist/ or build/, so these are read, but a large committed
 * bundle should not push hand-written scripts past the file cap.
 */
const LAST_DIRS: ReadonlySet<string> = new Set(['dist', 'build', '.next', 'target', 'coverage']);

/** A single file larger than this is skipped / 超過此大小的單一檔案略過 */
export const MAX_SCRIPT_BYTES = 256 * 1024;

/** Total bytes read per skill / 每個技能讀取的總位元組上限 */
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

/** At most this many files are read per skill / 每個技能最多讀取的檔案數 */
export const MAX_SCRIPT_FILES = 200;

/** Directory depth limit, so a symlink loop or deep tree cannot stall the audit */
const MAX_DEPTH = 8;

export interface BundledScript {
  /** Path relative to the skill directory, with forward slashes and no control characters */
  readonly path: string;
  readonly content: string;
}

/** Script files the walk found but did not return, by reason */
export interface SkippedScripts {
  readonly oversize: number;
  readonly overTotal: number;
  readonly overCount: number;
  readonly tooDeep: number;
  readonly binary: number;
  readonly minified: number;
}

export interface BundledScriptSet {
  readonly scripts: readonly BundledScript[];
  readonly skipped: SkippedScripts;
}

const NONE: SkippedScripts = {
  oversize: 0,
  overTotal: 0,
  overCount: 0,
  tooDeep: 0,
  binary: 0,
  minified: 0,
};

/** Total number of skipped script files */
export function skippedCount(skipped: SkippedScripts): number {
  return (
    skipped.oversize +
    skipped.overTotal +
    skipped.overCount +
    skipped.tooDeep +
    skipped.binary +
    skipped.minified
  );
}

interface Candidate {
  readonly full: string;
  readonly size: number;
}

/**
 * Read the script files under a skill directory.
 *
 * Returns nothing for a single-file skill (a path to a .md file), since there is
 * no directory of its own to read. Symbolic links are not followed. Files are
 * taken breadth first, with `scripts/`, `bin/`, `hooks/`, `src/` and `lib/`
 * ahead of other directories at the top level.
 */
export async function collectBundledScripts(skillDir: string): Promise<BundledScriptSet> {
  if (skillDir.endsWith('.md')) return { scripts: [], skipped: NONE };
  try {
    if (!(await stat(skillDir)).isDirectory()) return { scripts: [], skipped: NONE };
  } catch {
    return { scripts: [], skipped: NONE };
  }

  const { candidates, oversize, tooDeep, minified } = await walk(skillDir);
  const scripts: BundledScript[] = [];
  let totalBytes = 0;
  let overTotal = 0;
  let overCount = 0;
  let binary = 0;

  for (const candidate of candidates) {
    if (scripts.length >= MAX_SCRIPT_FILES) {
      overCount++;
      continue;
    }
    if (totalBytes + candidate.size > MAX_TOTAL_BYTES) {
      overTotal++;
      continue;
    }
    let content: string;
    try {
      content = await readFile(candidate.full, 'utf8');
    } catch {
      continue; // Unreadable or vanished: skip rather than fail the audit
    }
    if (content.includes('\u0000')) {
      binary++;
      continue;
    }
    totalBytes += candidate.size;
    scripts.push({ path: displayPath(skillDir, candidate.full), content });
  }

  return {
    scripts,
    skipped: { oversize, overTotal, overCount, tooDeep, binary, minified },
  };
}

function displayPath(root: string, full: string): string {
  return relative(root, full)
    .split(sep)
    .join('/')
    .replace(/[\u0000-\u001f\u007f]/g, '?'); // eslint-disable-line no-control-regex
}

interface WalkResult {
  readonly candidates: Candidate[];
  readonly oversize: number;
  readonly tooDeep: number;
  readonly minified: number;
}

async function walk(root: string): Promise<WalkResult> {
  const candidates: Candidate[] = [];
  let oversize = 0;
  let tooDeep = 0;
  let minified = 0;
  let level: string[] = [root];

  for (let depth = 0; level.length > 0; depth++) {
    const next: string[] = [];
    for (const dir of level) {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of sortEntries(entries, dir === root)) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (SKIPPED_DIRS.has(entry.name)) continue;
          if (depth + 1 > MAX_DEPTH) {
            tooDeep += await countScripts(full);
          } else {
            next.push(full);
          }
        } else if (entry.isFile() && isMinified(entry.name)) {
          minified++;
        } else if (entry.isFile() && isScript(entry.name)) {
          try {
            const size = (await stat(full)).size;
            if (size > MAX_SCRIPT_BYTES) oversize++;
            else candidates.push({ full, size });
          } catch {
            // Vanished between readdir and stat: skip
          }
        }
      }
    }
    level = next;
  }
  return { candidates, oversize, tooDeep, minified };
}

function isScript(name: string): boolean {
  return SCRIPT_EXTENSIONS.has(extname(name).toLowerCase()) && !isMinified(name);
}

function isMinified(name: string): boolean {
  return /\.min\.js$/i.test(name);
}

function sortEntries<T extends { name: string }>(entries: readonly T[], atRoot: boolean): T[] {
  const rank = (name: string): number => {
    if (!atRoot) return PRIORITY_DIRS.length;
    if (LAST_DIRS.has(name)) return PRIORITY_DIRS.length + 1;
    const i = PRIORITY_DIRS.indexOf(name);
    return i === -1 ? PRIORITY_DIRS.length : i;
  };
  return [...entries].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}

/** Count script files below a directory the walk will not enter, without reading them */
async function countScripts(dir: string, budget = { left: 1000 }): Promise<number> {
  let count = 0;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (budget.left-- <= 0) break;
    if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) {
      count += await countScripts(join(dir, entry.name), budget);
    } else if (entry.isFile() && (isScript(entry.name) || isMinified(entry.name))) {
      count++;
    }
  }
  return count;
}
