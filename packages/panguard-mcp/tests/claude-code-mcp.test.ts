import { describe, it, expect } from 'vitest';
import {
  installClaudeCodeEntry,
  readClaudeEntry,
  removeClaudeCodeEntry,
  repinClaudeCodeEntry,
} from '../src/config/claude-code-mcp.js';
import type { ClaudeExec } from '../src/config/claude-code-mcp.js';
import { SELF_VERSION } from '../src/config/package-spec.js';

const PINNED = `@panguard-ai/panguard-mcp@${SELF_VERSION}`;

const getOutput = (command: string, args: string): string =>
  `panguard:\n  Scope: User config\n  Status: Connected\n  Type: stdio\n  Command: ${command}\n  Args: ${args}\n`;

/** Fake `claude` CLI: records calls, serves `mcp get` from `entry`, can fail adds. */
function fakeClaude(opts: { entry?: string; failAddAt?: number[] }): {
  exec: ClaudeExec;
  calls: string[][];
} {
  const calls: string[][] = [];
  let adds = 0;
  const exec: ClaudeExec = (args) => {
    calls.push([...args]);
    if (args[1] === 'get') {
      if (!opts.entry) throw new Error('No MCP server found with name: panguard');
      return opts.entry;
    }
    if (args[1] === 'add') {
      adds += 1;
      if (opts.failAddAt?.includes(adds)) throw new Error('add failed');
    }
    return '';
  };
  return { exec, calls };
}

const verbs = (calls: string[][]): string[] => calls.map((c) => c[1] ?? '');

describe('Claude Code panguard entry', () => {
  it('reads our npx entry, pinned or not, and flags a custom one as not ours', () => {
    expect(
      readClaudeEntry(fakeClaude({ entry: getOutput('npx', '-y @panguard-ai/panguard-mcp') }).exec)
    ).toMatchObject({ present: true, ours: true, spec: '@panguard-ai/panguard-mcp' });
    expect(readClaudeEntry(fakeClaude({ entry: getOutput('npx', `-y ${PINNED}`) }).exec).spec).toBe(
      PINNED
    );
    expect(
      readClaudeEntry(fakeClaude({ entry: getOutput('node', '/opt/custom/server.js') }).exec).ours
    ).toBe(false);
    expect(readClaudeEntry(fakeClaude({}).exec).present).toBe(false);
  });

  it('adds the pinned entry when there is none (no remove first)', () => {
    const { exec, calls } = fakeClaude({});
    expect(installClaudeCodeEntry(exec)).toBe('added');
    expect(verbs(calls)).toEqual(['get', 'add']);
    expect(calls[1]).toContain(PINNED);
  });

  it('does not touch an already pinned entry', () => {
    const { exec, calls } = fakeClaude({ entry: getOutput('npx', `-y ${PINNED}`) });
    expect(installClaudeCodeEntry(exec)).toBe('unchanged');
    expect(verbs(calls)).toEqual(['get']);
  });

  it('never removes a customised entry', () => {
    const { exec, calls } = fakeClaude({ entry: getOutput('node', '/opt/custom/server.js') });
    expect(installClaudeCodeEntry(exec)).toBe('kept-custom');
    expect(removeClaudeCodeEntry(exec)).toBe('kept-custom');
    expect(verbs(calls)).not.toContain('remove');
  });

  it('replaces an unpinned entry of ours: remove, then add the pinned spec', () => {
    const { exec, calls } = fakeClaude({ entry: getOutput('npx', '-y @panguard-ai/panguard-mcp') });
    expect(installClaudeCodeEntry(exec)).toBe('repinned');
    expect(verbs(calls)).toEqual(['get', 'remove', 'add']);
    expect(calls[2]).toContain(PINNED);
  });

  it('restores the original entry when the pinned add fails', () => {
    const { exec, calls } = fakeClaude({
      entry: getOutput('npx', '-y @panguard-ai/panguard-mcp@0.0.1'),
      failAddAt: [1],
    });
    expect(() => installClaudeCodeEntry(exec)).toThrow('add failed');
    expect(verbs(calls)).toEqual(['get', 'remove', 'add', 'add']);
    expect(calls[2]).toContain(PINNED);
    expect(calls[3]).toContain('@panguard-ai/panguard-mcp@0.0.1');
  });

  it('repin touches nothing when there is no entry of ours to upgrade', () => {
    const none = fakeClaude({});
    expect(repinClaudeCodeEntry(none.exec)).toBe('unchanged');
    expect(verbs(none.calls)).toEqual(['get']);
    const old = fakeClaude({ entry: getOutput('npx', '-y @panguard-ai/panguard-mcp') });
    expect(repinClaudeCodeEntry(old.exec)).toBe('repinned');
  });

  it('removes only an entry of ours', () => {
    const ours = fakeClaude({ entry: getOutput('npx', `-y ${PINNED}`) });
    expect(removeClaudeCodeEntry(ours.exec)).toBe('removed');
    expect(ours.calls.at(-1)).toEqual(['mcp', 'remove', '--scope', 'user', 'panguard']);
    expect(removeClaudeCodeEntry(fakeClaude({}).exec)).toBe('absent');
  });
});
