/**
 * Compiled Python bytecode in a skill
 * 技能中的已編譯 Python 位元組碼
 *
 * Python loads `__pycache__/*.pyc` at import time, and a `.pyc` written with
 * unchecked-hash invalidation is loaded without being compared to its `.py`.
 * Every rule-based check reads source text, so code that lives only in bytecode
 * is never reviewed. A skill therefore must not be reported clean while it
 * carries bytecode: its presence is a finding in itself, and calls that the
 * readable strings of the bytecode name raise it to critical.
 *
 * @module @panguard-ai/panguard-scan/scanners/compiled-artifacts
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLogger } from '@panguard-ai/core';
import type { Finding } from './types.js';

const logger = createLogger('panguard-scan:compiled-artifacts');

/** Directories that are not part of the skill itself. */
const SKIP_DIRS: ReadonlySet<string> = new Set(['.git', 'node_modules']);

/** Extensions of Python bytecode the interpreter can load. */
const BYTECODE_EXTENSIONS: ReadonlySet<string> = new Set(['.pyc', '.pyo']);

/** Bytecode larger than this is still reported, but its strings are not read. */
const MAX_READ_BYTES = 2 * 1024 * 1024;

/** Shortest run of printable ASCII treated as a readable string. */
const MIN_STRING_LENGTH = 4;

/**
 * Names whose presence in bytecode means it can run commands, open network
 * connections or evaluate code. Matched as whole identifiers.
 */
const DANGEROUS_NAMES: readonly string[] = [
  'system',
  'popen',
  'subprocess',
  'Popen',
  'check_output',
  'socket',
  'connect',
  'exec',
  'eval',
  'compile',
  '__import__',
  'urlopen',
  'requests',
  'b64decode',
  'marshal',
  'ctypes',
];

interface BytecodeFile {
  readonly path: string;
  readonly size: number;
}

async function collectBytecode(root: string): Promise<BytecodeFile[]> {
  const found: BytecodeFile[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: import('node:fs').Dirent<string>[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true, encoding: 'utf-8' });
    } catch (err) {
      logger.debug(`Cannot read directory: ${dir}`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(full);
      } else if (
        entry.isFile() &&
        BYTECODE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        try {
          const stat = await fs.stat(full);
          found.push({ path: full, size: stat.size });
        } catch {
          found.push({ path: full, size: -1 });
        }
      }
    }
  }

  await walk(root);
  return found;
}

/** Readable ASCII strings embedded in a binary buffer. */
export function extractReadableStrings(buf: Uint8Array, minLength = MIN_STRING_LENGTH): string[] {
  const out: string[] = [];
  let run = '';
  for (const byte of buf) {
    if (byte >= 0x20 && byte <= 0x7e) {
      run += String.fromCharCode(byte);
    } else {
      if (run.length >= minLength) out.push(run);
      run = '';
    }
  }
  if (run.length >= minLength) out.push(run);
  return out;
}

/** Dangerous names that appear as whole identifiers in the given strings. */
export function findDangerousNames(strings: readonly string[]): string[] {
  const hits = new Set<string>();
  for (const s of strings) {
    for (const name of DANGEROUS_NAMES) {
      const re = new RegExp(
        `(?:^|[^A-Za-z0-9_])${name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&')}(?:$|[^A-Za-z0-9_])`
      );
      if (re.test(s)) hits.add(name);
    }
  }
  return [...hits].sort();
}

async function inspect(file: BytecodeFile): Promise<string[]> {
  if (file.size < 0 || file.size > MAX_READ_BYTES) return [];
  try {
    const buf = await fs.readFile(file.path);
    return findDangerousNames(extractReadableStrings(buf));
  } catch {
    return [];
  }
}

/**
 * Report Python bytecode shipped inside a skill directory.
 * 回報技能目錄中夾帶的 Python 位元組碼。
 *
 * @param skillDir - Skill directory to inspect / 要檢查的技能目錄
 * @returns One finding per bytecode file / 每個位元組碼檔案一筆發現
 */
export async function checkCompiledArtifacts(skillDir: string): Promise<Finding[]> {
  let stat: import('node:fs').Stats;
  try {
    stat = await fs.stat(skillDir);
  } catch {
    return [];
  }
  if (!stat.isDirectory()) return [];

  const files = await collectBytecode(skillDir);
  const findings: Finding[] = [];
  for (const file of files) {
    const names = await inspect(file);
    const rel = path.relative(skillDir, file.path) || path.basename(file.path);
    const critical = names.length > 0;
    findings.push({
      id: `compiled-bytecode-${findings.length + 1}`,
      title: critical
        ? `Python bytecode that can run commands or code: ${rel}`
        : `Python bytecode shipped in the skill: ${rel}`,
      description: critical
        ? `This compiled file names ${names.join(', ')}. Python may load it at import time without checking it against any source file, and source-based checks cannot review it.`
        : 'Python may load this compiled file at import time without checking it against any source file, and source-based checks cannot review it. A skill has no reason to ship bytecode.',
      severity: critical ? 'critical' : 'high',
      category: 'code',
      remediation:
        'Remove __pycache__ directories and .pyc/.pyo files from the skill and ship source only. Do not install a skill that arrives with bytecode you did not build yourself.',
      details: rel,
    });
  }
  return findings;
}
