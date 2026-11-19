/**
 * Claude Code MCP entry management through the `claude mcp` CLI.
 *
 * Claude Code keeps user-scope MCP servers in its own store (~/.claude.json),
 * managed with `claude mcp add|get|remove`. Writing `mcpServers` into
 * ~/.claude/settings.local.json is NOT a documented way to register a server,
 * so there is no file fallback: when the CLI cannot do it, the platform is
 * reported as not configured.
 *
 * An existing entry is only touched when it is one of OUR npx specs
 * (`npx -y @panguard-ai/panguard-mcp[@version]`); a customised entry is left
 * alone. Replacing an older entry restores the original when the add fails.
 */

import { execFileSync } from 'node:child_process';
import { MCP_PACKAGE, isSpecOf, pinnedSpec } from './package-spec.js';

/** Runs `claude <args>` and returns stdout; throws on a non-zero exit. */
export type ClaudeExec = (args: readonly string[]) => string;

export const defaultClaudeExec: ClaudeExec = (args) =>
  execFileSync('claude', [...args], {
    timeout: 15_000,
    stdio: 'pipe',
    windowsHide: true,
  }).toString();

export type ClaudeScope = 'user' | 'local' | 'project';

export interface ClaudeEntry {
  readonly present: boolean;
  /**
   * True only for exactly `npx -y @panguard-ai/panguard-mcp[@version]` with no
   * environment variables, no extra args, and a scope we can name. Anything else
   * is the user's own configuration and is never removed or rewritten.
   */
  readonly ours: boolean;
  /** The package spec argument (`@panguard-ai/panguard-mcp` or with `@version`). */
  readonly spec?: string;
  /** The scope the entry was read from; remove and add use this same scope. */
  readonly scope?: ClaudeScope;
}

/** The `claude` CLI could not be run (missing, timed out): nothing is known. */
export class ClaudeCliUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeCliUnavailableError';
  }
}

const NPX = /^npx(?:\.cmd)?$/i;

function parseScope(output: string): ClaudeScope | undefined {
  const label = /^\s*Scope:\s*(\w+)/m.exec(output)?.[1]?.toLowerCase();
  return label === 'user' || label === 'local' || label === 'project' ? label : undefined;
}

/** `Environment:` followed by inline text or by more-indented lines. */
function hasEnvironment(output: string): boolean {
  const m = /^([ \t]*)Environment:[ \t]*(.*)\n?((?:\1[ \t]+\S.*\n?)*)/m.exec(output);
  return m !== null && (m[2]!.trim() !== '' || m[3]!.trim() !== '');
}

function isUnavailable(err: unknown): boolean {
  const e = err as { code?: unknown; killed?: unknown; signal?: unknown };
  return e?.code === 'ENOENT' || e?.killed === true || e?.code === 'ETIMEDOUT';
}

/**
 * Parse `claude mcp get panguard`. A non-zero exit (no such server) means absent;
 * a CLI that cannot be run at all throws ClaudeCliUnavailableError.
 */
export function readClaudeEntry(exec: ClaudeExec): ClaudeEntry {
  let output: string;
  try {
    output = exec(['mcp', 'get', 'panguard']);
  } catch (err) {
    if (isUnavailable(err)) {
      throw new ClaudeCliUnavailableError('The claude CLI is not available');
    }
    return { present: false, ours: false };
  }
  const command = /^\s*Command:\s*(\S+)/m.exec(output)?.[1] ?? '';
  const args = (/^\s*Args:\s*(.*)$/m.exec(output)?.[1] ?? '').trim().split(/\s+/).filter(Boolean);
  const spec = args[1];
  const scope = parseScope(output);
  const exactArgs =
    args.length === 2 && args[0] === '-y' && spec !== undefined && isSpecOf(spec, MCP_PACKAGE);
  const ours = NPX.test(command) && exactArgs && !hasEnvironment(output) && scope !== undefined;
  return { present: true, ours, spec: exactArgs ? spec : undefined, scope };
}

function addArgs(spec: string, scope: ClaudeScope): string[] {
  return ['mcp', 'add', '--scope', scope, 'panguard', '--', 'npx', '-y', spec];
}

const removeArgs = (scope: ClaudeScope): string[] => [
  'mcp',
  'remove',
  '--scope',
  scope,
  'panguard',
];

export type ClaudeInstallOutcome = 'added' | 'repinned' | 'unchanged' | 'kept-custom';

/**
 * Make Claude Code's panguard entry the pinned spec.
 * Throws when the entry could not be added; an entry that was replaced is
 * restored first (same scope). Throws ClaudeCliUnavailableError when the CLI
 * cannot be run.
 */
export function installClaudeCodeEntry(exec: ClaudeExec = defaultClaudeExec): ClaudeInstallOutcome {
  const pinned = pinnedSpec(MCP_PACKAGE);
  const existing = readClaudeEntry(exec);

  if (existing.present && !existing.ours) return 'kept-custom';
  if (existing.present && existing.spec === pinned) return 'unchanged';

  if (!existing.present) {
    exec(addArgs(pinned, 'user'));
    return 'added';
  }

  // Older / unpinned entry of ours: replace it in the scope it was read from,
  // restoring the original on failure.
  const scope = existing.scope as ClaudeScope;
  exec(removeArgs(scope));
  try {
    exec(addArgs(pinned, scope));
    return 'repinned';
  } catch (err) {
    try {
      exec(addArgs(existing.spec ?? MCP_PACKAGE, scope));
    } catch {
      /* the original could not be restored either; surface the add error below */
    }
    throw err;
  }
}

/** Re-pin only: touches nothing unless an older/unpinned entry of ours exists. */
export function repinClaudeCodeEntry(exec: ClaudeExec = defaultClaudeExec): ClaudeInstallOutcome {
  const existing = readClaudeEntry(exec);
  if (!existing.present) return 'unchanged';
  if (!existing.ours) return 'kept-custom';
  if (existing.spec === pinnedSpec(MCP_PACKAGE)) return 'unchanged';
  return installClaudeCodeEntry(exec);
}

/** Remove Claude Code's panguard entry when (and only when) it is one of ours. */
export function removeClaudeCodeEntry(
  exec: ClaudeExec = defaultClaudeExec
): 'removed' | 'absent' | 'kept-custom' {
  const existing = readClaudeEntry(exec);
  if (!existing.present) return 'absent';
  if (!existing.ours) return 'kept-custom';
  exec(removeArgs(existing.scope as ClaudeScope));
  return 'removed';
}
