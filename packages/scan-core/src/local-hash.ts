/**
 * Hashes of local artifacts that never include an absolute local path.
 *
 * A hash of a path string is only as private as the path is unguessable: a
 * home directory plus a project name is easy to enumerate. These helpers hash
 * what an artifact IS (its files, or an MCP server's name and command shape)
 * instead of where it lives.
 */

import { createHash } from 'node:crypto';
import { closeSync, openSync, readSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HASH_HEX_LENGTH = 16;
const DEFAULT_MAX_FILES = 200;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;
const SKIPPED_DIRS = new Set(['node_modules', '.git', '.hg', '.svn']);

export interface DirectoryHashOptions {
  /** Maximum number of files hashed (sorted order, so the cut is deterministic). */
  readonly maxFiles?: number;
  /** Maximum total bytes read across all files. */
  readonly maxBytes?: number;
}

function listFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, rel: string): void => {
    let names: string[];
    try {
      names = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of names) {
      const relPath = rel ? `${rel}/${name}` : name;
      const full = join(dir, name);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (!SKIPPED_DIRS.has(name)) walk(full, relPath);
      } else if (stat.isFile()) {
        out.push(relPath);
      }
    }
  };
  walk(root, '');
  return out.sort();
}

function readBounded(path: string, limit: number): Buffer {
  if (limit <= 0) return Buffer.alloc(0);
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(limit);
    const n = readSync(fd, buf, 0, limit, 0);
    return buf.subarray(0, n);
  } finally {
    closeSync(fd);
  }
}

/**
 * Hash a directory by its content: the sorted RELATIVE file paths plus the file
 * bytes, bounded in file count and total bytes. The absolute path of `dir` is
 * never part of the input.
 */
export function directoryContentHash(dir: string, opts: DirectoryHashOptions = {}): string {
  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const hash = createHash('sha256');
  let remaining = maxBytes;
  for (const rel of listFiles(dir).slice(0, maxFiles)) {
    hash.update(`file:${rel}\n`);
    try {
      const bytes = readBounded(join(dir, rel), remaining);
      remaining -= bytes.length;
      hash.update(bytes);
    } catch {
      hash.update('unreadable');
    }
  }
  return hash.digest('hex').slice(0, HASH_HEX_LENGTH);
}

const ABSOLUTE_PATH = /^(?:[\\/]|~|[A-Za-z]:[\\/])/;

function baseName(value: string): string {
  const parts = value.split(/[\\/]+/).filter((p) => p.length > 0);
  return parts.length > 0 ? (parts[parts.length - 1] ?? '') : value;
}

/** Reduce an absolute path (also in `--flag=/abs/path` form) to its basename. */
export function stripLocalPath(arg: string): string {
  if (ABSOLUTE_PATH.test(arg)) return baseName(arg);
  const eq = arg.indexOf('=');
  if (eq > 0 && ABSOLUTE_PATH.test(arg.slice(eq + 1))) {
    return `${arg.slice(0, eq + 1)}${baseName(arg.slice(eq + 1))}`;
  }
  return arg;
}

/**
 * Hash an MCP server by its name, the basename of its command and its args with
 * every absolute path component reduced to a basename.
 */
export function mcpServerHash(server: {
  readonly name: string;
  readonly command: string;
  readonly args?: readonly string[];
}): string {
  const parts = [server.name, baseName(server.command), ...(server.args ?? []).map(stripLocalPath)];
  return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, HASH_HEX_LENGTH);
}
