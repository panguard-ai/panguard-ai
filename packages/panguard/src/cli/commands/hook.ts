/**
 * panguard hook — PreToolUse protection for an agent's BUILT-IN tools.
 *
 * The MCP proxy only sees MCP tool servers. An agent's built-in tools — Claude
 * Code's Bash / Edit / Write / WebFetch / Read — never touch the proxy, yet
 * they are the most dangerous surface (a prompt-injected agent runs a shell,
 * writes a file, or exfiltrates with its own tools). This command is a Claude
 * Code PreToolUse hook: it reads the tool call on stdin, evaluates it with the
 * ATR engine, and returns allow / ask / deny.
 *
 * Subcommands:
 *   pga hook run         — the hook itself (Claude Code invokes this per tool call)
 *   pga hook install     — register the hook in ~/.claude/settings.json
 *   pga hook uninstall   — remove it
 *   pga hook status      — is it registered?
 *
 * @module @panguard-ai/panguard/cli/commands/hook
 */

import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { c } from '@panguard-ai/core';
import { ProxyEvaluator } from '@panguard-ai/panguard-mcp-proxy/evaluator';

/** Built-in tools worth evaluating. Read is included to catch secret-file reads. */
const EVALUATED_TOOLS = ['Bash', 'Edit', 'MultiEdit', 'Write', 'Read', 'NotebookEdit', 'WebFetch'];
const HOOK_MATCHER = EVALUATED_TOOLS.join('|');
const HOOK_COMMAND = 'pga hook run';
const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');

interface ToolInput {
  [k: string]: unknown;
}

/**
 * Map a Claude Code tool call to the string we evaluate. CRITICAL: we evaluate
 * the COMMAND CONTENT, never the built-in tool's NAME. ATR has tool_name rules
 * that flag a tool literally named "Bash"/"exec"/"shell" (an MCP server exposing
 * a raw shell = excessive agency); for a built-in tool where Bash is normal,
 * that would false-positive on every call. So we pull the actionable payload.
 */
export function toolCallContent(toolName: string, input: ToolInput): string {
  const i = input ?? {};
  const s = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
  switch (toolName) {
    case 'Bash':
      return s(i['command']);
    case 'Edit':
      return `${s(i['file_path'])} ${s(i['new_string'])}`.trim();
    case 'MultiEdit': {
      const edits = Array.isArray(i['edits']) ? (i['edits'] as Array<Record<string, unknown>>) : [];
      return `${s(i['file_path'])} ${edits.map((e) => s(e?.['new_string'])).join(' ')}`.trim();
    }
    case 'Write':
      return `${s(i['file_path'])} ${s(i['content'])}`.trim();
    case 'Read':
      return s(i['file_path']);
    case 'NotebookEdit':
      return s(i['new_source']);
    case 'WebFetch':
      return `${s(i['url'])} ${s(i['prompt'])}`.trim();
    default:
      try {
        return JSON.stringify(i);
      } catch {
        return '';
      }
  }
}

/** The Claude Code PreToolUse output object for a non-allow decision. */
export function preToolUseOutput(
  decision: 'deny' | 'ask',
  reason: string
): Record<string, unknown> {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  };
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) resolve(data); // 1MB cap
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

/**
 * The hook itself. Reads the PreToolUse payload, evaluates the COMMAND CONTENT,
 * and emits a decision. FAIL-SAFE: any error → allow + stderr log. A buggy hook
 * must never brick the user's agent (the proxy + daemon remain as defense); a
 * crash here degrades to "no built-in-tool coverage", not "all calls blocked".
 */
export async function runHook(): Promise<void> {
  try {
    const raw = await readStdin();
    const payload = JSON.parse(raw || '{}') as { tool_name?: string; tool_input?: ToolInput };
    const toolName = String(payload.tool_name ?? '');
    if (!EVALUATED_TOOLS.includes(toolName)) {
      process.exit(0); // not a tool we evaluate → defer to Claude Code's own flow
    }
    const content = toolCallContent(toolName, payload.tool_input ?? {});
    if (!content.trim()) process.exit(0);

    const evaluator = new ProxyEvaluator();
    await evaluator.loadRules();
    // Neutral tool name 'command' so tool_name-existence rules never fire on the
    // built-in tool name; only the command content is judged.
    const result = await evaluator.evaluateToolCall('command', { input: content });

    if (result.outcome === 'allow') process.exit(0);
    const rules = result.matchedRules?.length
      ? ` [${result.matchedRules.slice(0, 3).join(', ')}]`
      : '';
    const reason = `PanGuard: ${result.reason || 'matched a detection rule'}${rules}`;
    process.stdout.write(
      JSON.stringify(preToolUseOutput(result.outcome as 'deny' | 'ask', reason))
    );
    process.exit(0);
  } catch (err) {
    process.stderr.write(
      `[panguard-hook] error (allowing): ${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exit(0);
  }
}

interface HookEntry {
  type: string;
  command: string;
}
interface HookMatcher {
  matcher?: string;
  hooks: HookEntry[];
}
interface ClaudeSettings {
  hooks?: { PreToolUse?: HookMatcher[]; [k: string]: unknown };
  [k: string]: unknown;
}

function readSettings(): ClaudeSettings {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8')) as ClaudeSettings;
  } catch {
    return {};
  }
}

function writeSettings(settings: ClaudeSettings): void {
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  const tmp = `${SETTINGS_PATH}.tmp.${process.pid}`;
  writeFileSync(tmp, JSON.stringify(settings, null, 2));
  renameSync(tmp, SETTINGS_PATH);
}

/** Is our PreToolUse hook already registered? (pure, for testing) */
export function isHookInstalled(settings: ClaudeSettings): boolean {
  const arr = settings.hooks?.PreToolUse ?? [];
  return arr.some((m) => m.hooks?.some((h) => h.command === HOOK_COMMAND));
}

/** Merge our hook into a settings object without clobbering existing hooks (pure). */
export function withHookInstalled(settings: ClaudeSettings): ClaudeSettings {
  if (isHookInstalled(settings)) return settings;
  const hooks = { ...(settings.hooks ?? {}) };
  const pre = Array.isArray(hooks.PreToolUse) ? [...hooks.PreToolUse] : [];
  pre.push({ matcher: HOOK_MATCHER, hooks: [{ type: 'command', command: HOOK_COMMAND }] });
  return { ...settings, hooks: { ...hooks, PreToolUse: pre } };
}

/** Remove our hook entry, leaving any other PreToolUse hooks intact (pure). */
export function withHookRemoved(settings: ClaudeSettings): ClaudeSettings {
  const pre = settings.hooks?.PreToolUse;
  if (!Array.isArray(pre)) return settings;
  const filtered = pre
    .map((m) => ({ ...m, hooks: (m.hooks ?? []).filter((h) => h.command !== HOOK_COMMAND) }))
    .filter((m) => m.hooks.length > 0);
  return { ...settings, hooks: { ...settings.hooks, PreToolUse: filtered } };
}

/**
 * Read → merge → write the PreToolUse hook into ~/.claude/settings.json. Returns
 * 'installed' if newly added, 'already' if present. Reused by `pga hook install`
 * and the `pga up` deploy step so built-in-tool protection is on by default.
 */
export function installHook(): 'installed' | 'already' {
  const settings = readSettings();
  if (isHookInstalled(settings)) return 'already';
  writeSettings(withHookInstalled(settings));
  return 'installed';
}

export function hookCommand(): Command {
  const cmd = new Command('hook').description(
    'PreToolUse protection for built-in agent tools (Bash/Edit/Write/WebFetch)'
  );

  cmd
    .command('run')
    .description('Run the PreToolUse hook (invoked by Claude Code; reads stdin)')
    .action(async () => {
      await runHook();
    });

  cmd
    .command('install')
    .description('Register the PreToolUse hook in ~/.claude/settings.json')
    .action(() => {
      const settings = readSettings();
      if (isHookInstalled(settings)) {
        console.log(`  ${c.dim('Hook already installed in')} ${SETTINGS_PATH}`);
        return;
      }
      writeSettings(withHookInstalled(settings));
      console.log(`  ${c.safe('PreToolUse hook installed')} → ${SETTINGS_PATH}`);
      console.log(`  ${c.dim(`Guards built-in tools: ${EVALUATED_TOOLS.join(', ')}`)}`);
      console.log(`  ${c.dim('Restart Claude Code for the hook to take effect.')}`);
    });

  cmd
    .command('uninstall')
    .description('Remove the PanGuard PreToolUse hook from ~/.claude/settings.json')
    .action(() => {
      const settings = readSettings();
      if (!isHookInstalled(settings)) {
        console.log(`  ${c.dim('Hook not installed.')}`);
        return;
      }
      writeSettings(withHookRemoved(settings));
      console.log(`  ${c.safe('PreToolUse hook removed.')}`);
    });

  cmd
    .command('status')
    .description('Show whether the PreToolUse hook is registered')
    .action(() => {
      const installed = isHookInstalled(readSettings());
      console.log(
        installed
          ? `  ${c.safe('PreToolUse hook is ACTIVE')} — built-in tools (${EVALUATED_TOOLS.join(', ')}) are evaluated.`
          : `  ${c.caution('PreToolUse hook is NOT installed')} — built-in tools are not evaluated. Run: pga hook install`
      );
    });

  return cmd;
}
