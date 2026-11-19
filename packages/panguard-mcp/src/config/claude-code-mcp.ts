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

export interface ClaudeEntry {
  readonly present: boolean;
  /** True when the entry is `npx ... @panguard-ai/panguard-mcp[@version]`. */
  readonly ours: boolean;
  /** The package spec argument (`@panguard-ai/panguard-mcp` or with `@version`). */
  readonly spec?: string;
}

const NPX = /^npx(?:\.cmd)?$/i;

/** Parse `claude mcp get panguard`; an error (no such server) means absent. */
export function readClaudeEntry(exec: ClaudeExec): ClaudeEntry {
  let output: string;
  try {
    output = exec(['mcp', 'get', 'panguard']);
  } catch {
    return { present: false, ours: false };
  }
  const command = /^\s*Command:\s*(\S+)/m.exec(output)?.[1] ?? '';
  const args = (/^\s*Args:\s*(.*)$/m.exec(output)?.[1] ?? '').trim().split(/\s+/);
  const spec = args.find((a) => isSpecOf(a, MCP_PACKAGE));
  return { present: true, ours: NPX.test(command) && spec !== undefined, spec };
}

function addArgs(spec: string): string[] {
  return ['mcp', 'add', '--scope', 'user', 'panguard', '--', 'npx', '-y', spec];
}

const removeArgs = ['mcp', 'remove', '--scope', 'user', 'panguard'];

export type ClaudeInstallOutcome = 'added' | 'repinned' | 'unchanged' | 'kept-custom';

/**
 * Make Claude Code's panguard entry the pinned spec.
 * Throws when the entry could not be added; an entry that was replaced is
 * restored first.
 */
export function installClaudeCodeEntry(exec: ClaudeExec = defaultClaudeExec): ClaudeInstallOutcome {
  const pinned = pinnedSpec(MCP_PACKAGE);
  const existing = readClaudeEntry(exec);

  if (existing.present && !existing.ours) return 'kept-custom';
  if (existing.present && existing.spec === pinned) return 'unchanged';

  if (!existing.present) {
    exec(addArgs(pinned));
    return 'added';
  }

  // Older / unpinned entry of ours: replace it, restoring the original on failure.
  exec(removeArgs);
  try {
    exec(addArgs(pinned));
    return 'repinned';
  } catch (err) {
    try {
      exec(addArgs(existing.spec ?? MCP_PACKAGE));
    } catch {
      /* the original could not be restored either; surface the add error below */
    }
    throw err;
  }
}

/** Re-pin only: touches nothing unless an older/unpinned entry of ours exists. */
export function repinClaudeCodeEntry(exec: ClaudeExec = defaultClaudeExec): ClaudeInstallOutcome {
  const existing = readClaudeEntry(exec);
  if (!existing.present || !existing.ours || existing.spec === pinnedSpec(MCP_PACKAGE)) {
    return existing.present && !existing.ours ? 'kept-custom' : 'unchanged';
  }
  return installClaudeCodeEntry(exec);
}

/** Remove Claude Code's panguard entry when (and only when) it is one of ours. */
export function removeClaudeCodeEntry(
  exec: ClaudeExec = defaultClaudeExec
): 'removed' | 'absent' | 'kept-custom' {
  const existing = readClaudeEntry(exec);
  if (!existing.present) return 'absent';
  if (!existing.ours) return 'kept-custom';
  exec(removeArgs);
  return 'removed';
}
