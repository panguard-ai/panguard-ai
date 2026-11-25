/**
 * Hashes of local artifacts that never include an absolute local path.
 *
 * A hash of a path string is only as private as the path is unguessable: a
 * home directory plus a project name is easy to enumerate. These helpers hash
 * what an artifact IS (its files, or an MCP server's name and command shape)
 * instead of where it lives.
 */

import { createHash } from 'node:crypto';
import { closeSync, fstatSync, openSync, readSync, readdirSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { join } from 'node:path';

const HASH_HEX_LENGTH = 16;
const DEFAULT_MAX_FILES = 200;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;
const DEFAULT_MAX_DEPTH = 8;
const SKIPPED_DIRS = new Set(['node_modules', '.git', '.hg', '.svn']);

export interface DirectoryHashOptions {
  /** Maximum number of files hashed. The walk stops as soon as it is reached. */
  readonly maxFiles?: number;
  /** Maximum total bytes read across all files. */
  readonly maxBytes?: number;
  /** Maximum directory depth below the root. */
  readonly maxDepth?: number;
}

function sortedEntries(dir: string): Dirent[] {
  try {
    return readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    );
  } catch {
    return [];
  }
}

/**
 * Collect up to `maxFiles` regular files in a deterministic depth-first order.
 * Symbolic links (to files or directories) are never followed or hashed, the
 * depth is bounded, and the walk stops as soon as the file limit is reached.
 */
function collectFiles(root: string, maxFiles: number, maxDepth: number): string[] {
  const out: string[] = [];
  const walk = (dir: string, rel: string, depth: number): void => {
    for (const entry of sortedEntries(dir)) {
      if (out.length >= maxFiles) return;
      if (entry.isSymbolicLink()) continue;
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (depth < maxDepth && !SKIPPED_DIRS.has(entry.name)) {
          walk(join(dir, entry.name), relPath, depth + 1);
        }
      } else if (entry.isFile()) {
        out.push(relPath);
      }
    }
  };
  walk(root, '', 0);
  return out;
}

function readBounded(path: string, limit: number): Buffer {
  if (limit <= 0) return Buffer.alloc(0);
  const fd = openSync(path, 'r');
  try {
    const size = fstatSync(fd).size;
    const buf = Buffer.alloc(Math.min(limit, size));
    const n = readSync(fd, buf, 0, buf.length, 0);
    return buf.subarray(0, n);
  } finally {
    closeSync(fd);
  }
}

/**
 * Hash a directory by its content: the relative file paths plus the file bytes,
 * bounded in file count, total bytes and depth. Symbolic links are skipped. The
 * absolute path of `dir` is never part of the input.
 */
export function directoryContentHash(dir: string, opts: DirectoryHashOptions = {}): string {
  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  const hash = createHash('sha256');
  let remaining = maxBytes;
  for (const rel of collectFiles(dir, maxFiles, maxDepth)) {
    hash.update(`file:${rel}\n`);
    if (remaining <= 0) continue;
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
