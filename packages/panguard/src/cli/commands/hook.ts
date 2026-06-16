/**
 * panguard hook — PreToolUse protection for an agent's BUILT-IN tools, across
 * every platform that exposes a pre-tool-execution hook.
 *
 * The MCP proxy only sees MCP tool servers. An agent's built-in tools (shell,
 * file edit/write, web fetch) bypass it — the most dangerous surface. This
 * command is a per-platform tool-call hook: it reads the tool call on stdin,
 * evaluates the COMMAND CONTENT with the ATR engine, and emits allow / ask /
 * deny in the EXACT contract each host requires (verified per platform — a
 * wrong byte = the host silently ignores the deny = fake protection).
 *
 * Output-format groups (verified 2026-06-16):
 *   claude  → {hookSpecificOutput:{permissionDecision}}   claude-code, continue, codex
 *   cursor  → {permission, agent_message}                 cursor
 *   gemini  → {decision, reason}                          gemini-cli
 *   cline   → {cancel, errorMessage}  (nested stdin)      cline
 *   windsurf→ exit 2 + stderr (no JSON)                   windsurf
 *
 * @module @panguard-ai/panguard/cli/commands/hook
 */

import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { c } from '@panguard-ai/core';
import { ProxyEvaluator } from '@panguard-ai/panguard-mcp-proxy/evaluator';

// ── Platforms ───────────────────────────────────────────────────────────────

export type HookPlatform =
  | 'claude-code'
  | 'continue'
  | 'codex'
  | 'cursor'
  | 'gemini'
  | 'cline'
  | 'windsurf';

type OutputFormat = 'claude' | 'cursor' | 'gemini' | 'cline' | 'windsurf';
type Verdict = 'allow' | 'ask' | 'deny';

interface PlatformSpec {
  readonly format: OutputFormat;
  /** Does the host support an ASK verdict? If not, ASK downgrades to deny (safe). */
  readonly ask: boolean;
}

const PLATFORMS: Record<HookPlatform, PlatformSpec> = {
  'claude-code': { format: 'claude', ask: true },
  continue: { format: 'claude', ask: true },
  codex: { format: 'claude', ask: false },
  cursor: { format: 'cursor', ask: true },
  gemini: { format: 'gemini', ask: true },
  cline: { format: 'cline', ask: false },
  windsurf: { format: 'windsurf', ask: false },
};

// ── Input normalization (stdin shape differs per platform) ───────────────────

interface ToolInput {
  [k: string]: unknown;
}
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

/**
 * Extract the actionable COMMAND CONTENT from a tool's arguments, across tool
 * vocabularies. We deliberately evaluate the command/content, NOT the tool name
 * (ATR has tool_name-existence rules that flag a tool literally named
 * "Bash"/"shell" — false-positiving every built-in call).
 */
function contentFromArgs(toolName: string, input: ToolInput): string {
  const i = input ?? {};
  const t = toolName.toLowerCase();
  // shell
  if (t.includes('bash') || t.includes('shell') || t.includes('command') || t === 'run')
    return str(i['command'] ?? i['cmd'] ?? i['command_line']);
  // file write/edit
  if (t.includes('write') || t.includes('edit') || t.includes('replace') || t.includes('patch'))
    return `${str(i['file_path'] ?? i['path'] ?? i['filePath'])} ${str(i['new_string'] ?? i['content'] ?? i['new_str'])}`.trim();
  if (t.includes('read')) return str(i['file_path'] ?? i['path'] ?? i['filePath']);
  if (t.includes('notebook')) return str(i['new_source']);
  // web
  if (t.includes('fetch') || t.includes('web'))
    return `${str(i['url'])} ${str(i['prompt'] ?? i['query'])}`.trim();
  try {
    return JSON.stringify(i);
  } catch {
    return '';
  }
}

/** Built-in tools we evaluate, by the Claude-Code vocabulary (used for the matcher). */
const EVALUATED_TOOLS = ['Bash', 'Edit', 'MultiEdit', 'Write', 'Read', 'NotebookEdit', 'WebFetch'];

/** Map any platform's stdin payload to { toolName, content }, or null to abstain. */
export function normalizeInput(
  platform: HookPlatform,
  payload: Record<string, unknown>
): { toolName: string; content: string } | null {
  if (platform === 'cline') {
    const p = (payload['preToolUse'] ?? {}) as Record<string, unknown>;
    const toolName = str(p['toolName']);
    if (!toolName) return null;
    return { toolName, content: contentFromArgs(toolName, (p['parameters'] ?? {}) as ToolInput) };
  }
  if (platform === 'windsurf') {
    const ti = (payload['tool_info'] ?? {}) as Record<string, unknown>;
    const action = str(payload['agent_action_name']);
    const content = str(ti['command_line'] ?? ti['file_path']) || contentFromArgs(action, ti);
    return content ? { toolName: action || 'command', content } : null;
  }
  if (platform === 'cursor') {
    // beforeShellExecution → top-level command; beforeMCPExecution → tool_name + tool_input(string)
    if (payload['command'] != null) return { toolName: 'shell', content: str(payload['command']) };
    const toolName = str(payload['tool_name']);
    let input: ToolInput = {};
    const raw = payload['tool_input'];
    if (typeof raw === 'string') {
      try {
        input = JSON.parse(raw) as ToolInput;
      } catch {
        input = { _raw: raw };
      }
    } else if (raw && typeof raw === 'object') input = raw as ToolInput;
    if (!toolName && !Object.keys(input).length) return null;
    return { toolName: toolName || 'tool', content: contentFromArgs(toolName, input) };
  }
  // claude-code / continue / codex / gemini: top-level tool_name + tool_input
  const toolName = str(payload['tool_name']);
  if (!toolName) return null;
  return {
    toolName,
    content: contentFromArgs(toolName, (payload['tool_input'] ?? {}) as ToolInput),
  };
}

// ── Output adapters (the security-critical part — byte-exact per host) ───────

export interface Emission {
  readonly stdout?: string;
  readonly stderr?: string;
  readonly exit: number;
}

/**
 * Build the exact host response for a verdict. ALLOW = abstain (exit 0, no
 * stdout) so we never bypass the host's own permission flow. ASK downgrades to
 * deny on hosts without an ask verdict (codex/cline/windsurf) — safe, never to
 * allow. Pure + exported for testing.
 */
export function emitFor(platform: HookPlatform, verdict: Verdict, reason: string): Emission {
  const spec = PLATFORMS[platform];
  if (verdict === 'allow') return { exit: 0 };
  // Downgrade ask→deny where the host has no ask verdict.
  const v: 'ask' | 'deny' = verdict === 'ask' && !spec.ask ? 'deny' : verdict;
  switch (spec.format) {
    case 'claude':
      return {
        exit: 0,
        stdout: JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: v,
            permissionDecisionReason: reason,
          },
        }),
      };
    case 'cursor':
      return {
        exit: 0,
        stdout: JSON.stringify({ permission: v, agent_message: reason, user_message: reason }),
      };
    case 'gemini':
      return { exit: 0, stdout: JSON.stringify({ decision: v, reason }) };
    case 'cline':
      // No ask; deny → cancel:true. (ask already downgraded to deny above.)
      return { exit: 0, stdout: JSON.stringify({ cancel: true, errorMessage: reason }) };
    case 'windsurf':
      // No JSON contract: the ONLY non-zero exit we ever emit is exactly 2.
      return { exit: 2, stderr: reason };
  }
}

// ── 0-rules fail-open detection (degraded-protection signal) ─────────────────

/**
 * Where the hook records that it loaded 0 rules on its last run. Lives in the
 * shared guard state dir (~/.panguard-guard) so `pga doctor` and the dashboard
 * can surface "protection degraded" — fail-OPEN is the correct safety choice
 * (a hook with no rules must not brick the agent), but SILENT permanent
 * no-protection is not acceptable. The marker is JSON: { degraded, ruleCount,
 * at } and is cleared the moment a run loads rules again.
 */
const hookStatusPath = (): string =>
  join(homedir(), '.panguard-guard', 'hook-protection-status.json');

/**
 * Has this process already emitted the stderr fail-open warning? The hook is a
 * short-lived per-tool-call process, but a host may reuse it; emit the loud
 * stderr line at most ONCE per process so we are noisy enough to be noticed
 * without spamming every tool call within a single invocation.
 */
let warnedZeroRules = false;

/**
 * Record the degraded (0-rules) protection state for doctor/dashboard, and emit
 * a one-time stderr warning. Best-effort: a failure to write the marker (e.g.
 * read-only HOME) must never break the hook — we still allow the tool call.
 */
function signalZeroRulesFailOpen(): void {
  if (!warnedZeroRules) {
    warnedZeroRules = true;
    process.stderr.write(
      '[panguard-hook] WARNING: 0 detection rules loaded — built-in-tool protection is ' +
        'DEGRADED (allowing all tool calls). Run "pga doctor" / "pga guard sync-rules" to ' +
        'restore protection.\n'
    );
  }
  try {
    const path = hookStatusPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify({ degraded: true, ruleCount: 0, at: new Date().toISOString() }, null, 2),
      { mode: 0o600 }
    );
  } catch {
    /* best-effort marker; never block the agent on a write failure */
  }
}

/**
 * Clear the degraded marker once rules load again (healthy run). Best-effort —
 * we overwrite with a healthy record rather than deleting, so the file stays a
 * stable readable signal of "last hook run was OK". Only writes when a stale
 * degraded marker exists, to avoid touching disk on every healthy tool call.
 */
function clearZeroRulesFailOpen(ruleCount: number): void {
  try {
    const path = hookStatusPath();
    if (!existsSync(path)) return;
    const prev = JSON.parse(readFileSync(path, 'utf-8')) as { degraded?: boolean };
    if (prev.degraded !== true) return; // already healthy; nothing to clear
    writeFileSync(
      path,
      JSON.stringify({ degraded: false, ruleCount, at: new Date().toISOString() }, null, 2),
      { mode: 0o600 }
    );
  } catch {
    /* best-effort */
  }
}

/**
 * Read the last-recorded hook protection status, for `pga doctor` / dashboard.
 * Returns null when no hook has run yet (no marker) or the marker is unreadable.
 * `degraded: true` means the most recent hook run loaded 0 rules and therefore
 * allowed every built-in-tool call (no enforcement).
 */
export function readHookProtectionStatus(): { degraded: boolean; ruleCount: number; at: string } | null {
  try {
    const path = hookStatusPath();
    if (!existsSync(path)) return null;
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as {
      degraded?: boolean;
      ruleCount?: number;
      at?: string;
    };
    return {
      degraded: parsed.degraded === true,
      ruleCount: typeof parsed.ruleCount === 'number' ? parsed.ruleCount : 0,
      at: typeof parsed.at === 'string' ? parsed.at : '',
    };
  } catch {
    return null;
  }
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
      if (data.length > 1_000_000) resolve(data);
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

/**
 * The hook. Reads the tool call, evaluates the COMMAND CONTENT, emits the host's
 * exact verdict. FAIL-SAFE: any error → allow (exit 0) + stderr log — a buggy
 * hook must never brick the agent (the proxy + daemon remain). The windsurf
 * adapter's only non-zero exit is 2 (exit 1 = silent fail-open there).
 */
export async function runHook(platform: HookPlatform): Promise<void> {
  const apply = (e: Emission): never => {
    if (e.stdout) process.stdout.write(e.stdout);
    if (e.stderr) process.stderr.write(e.stderr + '\n');
    process.exit(e.exit);
  };
  try {
    const raw = await readStdin();
    const payload = JSON.parse(raw || '{}') as Record<string, unknown>;
    const norm = normalizeInput(platform, payload);
    if (!norm || !norm.content.trim()) process.exit(0);

    const evaluator = new ProxyEvaluator();
    const ruleCount = await evaluator.loadRules();
    if (ruleCount <= 0) {
      // Fail-OPEN (correct: never brick the agent) but NOT silent — record the
      // degraded state + warn once on stderr so doctor/dashboard/user can see
      // that protection is currently a no-op, then allow the tool call.
      signalZeroRulesFailOpen();
      process.exit(0);
    }
    // Rules loaded → ensure any prior degraded marker is cleared.
    clearZeroRulesFailOpen(ruleCount);
    // Neutral tool name so tool_name-existence rules never fire on a built-in
    // tool name; only the command content is judged.
    const result = await evaluator.evaluateToolCall('command', { input: norm.content });
    if (result.outcome === 'allow') process.exit(0);

    const rules = result.matchedRules?.length
      ? ` [${result.matchedRules.slice(0, 3).join(', ')}]`
      : '';
    const reason = `PanGuard: ${result.reason || 'matched a detection rule'}${rules}`;
    apply(emitFor(platform, result.outcome as Verdict, reason));
  } catch (err) {
    process.stderr.write(
      `[panguard-hook] error (allowing): ${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exit(0);
  }
}

// ── Registration (per-platform config; idempotent, non-clobbering) ───────────

const HOOK_CMD = (p: HookPlatform): string => `pga hook run --platform ${p}`;
const TOOL_MATCHER = EVALUATED_TOOLS.join('|');

/**
 * Read an existing JSON config we are about to ROUND-TRIP (read → merge → write
 * back). The verdict MUST distinguish three cases, because conflating them
 * destroys user data:
 *   - 'absent': file does not exist → safe to start from {} and write a fresh one.
 *   - 'ok':     file exists and parsed → safe to merge into and write back.
 *   - 'corrupt':file exists but is NOT valid JSON → DANGER. We must NOT write,
 *               or we silently wipe the user's permissions/env/model/MCP servers
 *               that we simply failed to parse. Caller aborts this platform.
 *
 * The previous readJson() returned {} on BOTH absent and corrupt, so a single
 * stray byte in ~/.claude/settings.json caused installFor to overwrite the file
 * with an object containing only our hooks key.
 */
type JsonRead =
  | { kind: 'absent' }
  | { kind: 'ok'; data: Record<string, unknown> }
  | { kind: 'corrupt'; error: string };

function readJsonForRoundTrip(path: string): JsonRead {
  if (!existsSync(path)) return { kind: 'absent' };
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    // File exists but is unreadable (permissions/IO) — treat as corrupt: do not
    // overwrite something we could not even read.
    return { kind: 'corrupt', error: err instanceof Error ? err.message : String(err) };
  }
  // A genuinely empty file is treated as absent-equivalent (safe to start fresh).
  if (raw.trim() === '') return { kind: 'absent' };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { kind: 'ok', data: parsed as Record<string, unknown> };
    }
    return { kind: 'corrupt', error: 'top-level JSON value is not an object' };
  } catch (err) {
    return { kind: 'corrupt', error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Resolve an existing config for a round-trip write, or signal abort. Returns
 * the object to merge into ({} when the file was genuinely absent), or null when
 * the file exists but could not be parsed — in which case the caller records a
 * clear error and NEVER writes over the file. The corruption reason is captured
 * in `lastInstallError` for the install command to surface.
 */
function configOrAbort(path: string, label: string): Record<string, unknown> | null {
  const r = readJsonForRoundTrip(path);
  if (r.kind === 'absent') return {};
  if (r.kind === 'ok') return r.data;
  lastInstallError = `${label} (${path}) exists but is not valid JSON (${r.error}). PanGuard did NOT modify it — fix or back up the file, then re-run "pga hook install".`;
  return null;
}

/**
 * Last human-readable reason a platform install returned 'error'. Written by
 * configOrAbort / installFor and read by the install command to tell the user
 * exactly which config could not be parsed (so they can fix it before we ever
 * touch it). Reset at the top of each installFor call.
 */
let lastInstallError: string | null = null;

/** The reason the most recent installFor() returned 'error', if any. */
export function lastHookInstallError(): string | null {
  return lastInstallError;
}
function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, path);
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

/**
 * Path to Claude's settings file, resolved lazily so it always reflects the
 * current homedir() (consistent with every other platform writer, which all
 * compute their path inside installFor). A module-level const would freeze the
 * path at import time.
 */
const claudeSettingsPath = (): string => join(homedir(), '.claude', 'settings.json');

/** Is our PreToolUse hook present in a Claude-style settings object? (pure) */
export function isHookInstalled(settings: ClaudeSettings): boolean {
  const arr = settings.hooks?.PreToolUse ?? [];
  return arr.some((m) => m.hooks?.some((h) => h.command?.startsWith('pga hook run')));
}
/** Merge our hook into Claude-style settings without clobbering existing hooks (pure). */
export function withHookInstalled(
  settings: ClaudeSettings,
  cmd = HOOK_CMD('claude-code')
): ClaudeSettings {
  if (isHookInstalled(settings)) return settings;
  const hooks = { ...(settings.hooks ?? {}) };
  const pre = Array.isArray(hooks.PreToolUse) ? [...hooks.PreToolUse] : [];
  pre.push({ matcher: TOOL_MATCHER, hooks: [{ type: 'command', command: cmd }] });
  return { ...settings, hooks: { ...hooks, PreToolUse: pre } };
}
/** Remove our hook entry, leaving any other PreToolUse hooks intact (pure). */
export function withHookRemoved(settings: ClaudeSettings): ClaudeSettings {
  const pre = settings.hooks?.PreToolUse;
  if (!Array.isArray(pre)) return settings;
  const filtered = pre
    .map((m) => ({
      ...m,
      hooks: (m.hooks ?? []).filter((h) => !h.command?.startsWith('pga hook run')),
    }))
    .filter((m) => m.hooks.length > 0);
  return { ...settings, hooks: { ...settings.hooks, PreToolUse: filtered } };
}

/**
 * Register the hook for one platform, writing its exact config. Returns a status.
 *
 * DATA-LOSS SAFETY: every writer that round-trips an EXISTING user config reads
 * it through configOrAbort, which returns null when the file exists but cannot
 * be parsed. On null we abort that platform with 'error' (and a clear message in
 * lastInstallError) and NEVER write — overwriting an unparseable settings.json
 * would wipe the user's permissions/env/model/MCP servers. We only merge-write
 * when the file was successfully parsed (kind 'ok') or genuinely absent
 * (configOrAbort returns {}). Every writer spreads the parsed object first, so
 * all existing top-level keys are preserved.
 */
export function installFor(platform: HookPlatform): 'installed' | 'already' | 'error' {
  lastInstallError = null;
  try {
    switch (platform) {
      case 'claude-code':
      case 'continue': {
        // Continue reads ~/.claude/settings.json too, so the Claude entry covers both.
        const settingsPath = claudeSettingsPath();
        const base = configOrAbort(settingsPath, 'Claude settings');
        if (base === null) return 'error';
        const s = base as ClaudeSettings;
        if (isHookInstalled(s)) return 'already';
        // withHookInstalled spreads `s`, preserving permissions/env/model/MCP keys.
        writeJson(settingsPath, withHookInstalled(s, HOOK_CMD('claude-code')));
        return 'installed';
      }
      case 'codex': {
        const path = join(homedir(), '.codex', 'hooks.json');
        const base = configOrAbort(path, 'Codex hooks');
        if (base === null) return 'error';
        const s = base as ClaudeSettings;
        if (isHookInstalled(s)) return 'already';
        const hooks = { ...(s.hooks ?? {}) };
        const pre = Array.isArray(hooks.PreToolUse) ? [...hooks.PreToolUse] : [];
        pre.push({
          matcher: 'Bash|apply_patch',
          hooks: [{ type: 'command', command: HOOK_CMD('codex') }],
        });
        writeJson(path, { ...s, hooks: { ...hooks, PreToolUse: pre } });
        return 'installed';
      }
      case 'gemini': {
        const path = join(homedir(), '.gemini', 'settings.json');
        const base = configOrAbort(path, 'Gemini settings');
        if (base === null) return 'error';
        const s = base as { hooks?: { BeforeTool?: unknown[] }; [k: string]: unknown };
        const before = Array.isArray(s.hooks?.BeforeTool)
          ? [...(s.hooks!.BeforeTool as unknown[])]
          : [];
        if (JSON.stringify(before).includes('pga hook run')) return 'already';
        before.push({
          matcher: 'run_shell_command|write_file|replace',
          hooks: [
            { name: 'panguard-atr', type: 'command', command: HOOK_CMD('gemini'), timeout: 10000 },
          ],
        });
        writeJson(path, { ...s, hooks: { ...(s.hooks ?? {}), BeforeTool: before } });
        return 'installed';
      }
      case 'cursor': {
        const path = join(homedir(), '.cursor', 'hooks.json');
        const base = configOrAbort(path, 'Cursor hooks');
        if (base === null) return 'error';
        const s = base as { version?: number; hooks?: Record<string, unknown[]> };
        const hooks = { ...(s.hooks ?? {}) };
        if (JSON.stringify(hooks).includes('pga hook run')) return 'already';
        for (const ev of ['beforeShellExecution', 'beforeMCPExecution']) {
          const arr = Array.isArray(hooks[ev]) ? [...(hooks[ev] as unknown[])] : [];
          arr.push({ command: HOOK_CMD('cursor'), failClosed: true });
          hooks[ev] = arr;
        }
        writeJson(path, { version: 1, ...s, hooks });
        return 'installed';
      }
      case 'windsurf': {
        const path = join(homedir(), '.codeium', 'windsurf', 'hooks.json');
        const base = configOrAbort(path, 'Windsurf hooks');
        if (base === null) return 'error';
        const s = base as { hooks?: Record<string, unknown[]> };
        const hooks = { ...(s.hooks ?? {}) };
        if (JSON.stringify(hooks).includes('pga hook run')) return 'already';
        for (const ev of ['pre_run_command', 'pre_write_code', 'pre_mcp_tool_use']) {
          const arr = Array.isArray(hooks[ev]) ? [...(hooks[ev] as unknown[])] : [];
          arr.push({ command: HOOK_CMD('windsurf'), show_output: true });
          hooks[ev] = arr;
        }
        writeJson(path, { ...s, hooks });
        return 'installed';
      }
      case 'cline': {
        // Filename-based: an executable named after the event. macOS/Linux only.
        // Not a JSON round-trip — the file is our own script, so there is no user
        // config to clobber; we only skip if it already references our hook.
        const dir = join(homedir(), 'Documents', 'Cline', 'Rules', 'Hooks');
        const file = join(dir, 'PreToolUse');
        if (existsSync(file) && readFileSync(file, 'utf-8').includes('pga hook run'))
          return 'already';
        mkdirSync(dir, { recursive: true });
        writeFileSync(file, '#!/usr/bin/env bash\nexec pga hook run --platform cline\n', {
          mode: 0o755,
        });
        chmodSync(file, 0o755);
        return 'installed';
      }
    }
  } catch (err) {
    lastInstallError = err instanceof Error ? err.message : String(err);
    return 'error';
  }
}

/** Claude-only install, kept for `pga up` back-compat. */
export function installHook(): 'installed' | 'already' {
  const r = installFor('claude-code');
  return r === 'error' ? 'already' : r;
}

/** Platforms that have a built-in-tool hook PanGuard can wire (closes the blind spot). */
export const HOOKABLE_PLATFORMS: HookPlatform[] = [
  'claude-code',
  'continue',
  'codex',
  'cursor',
  'gemini',
  'cline',
  'windsurf',
];

/** Map a detected platform id (platform-detector) to a hookable platform, if any. */
export function toHookPlatform(detectedId: string): HookPlatform | null {
  const map: Record<string, HookPlatform> = {
    'claude-code': 'claude-code',
    continue: 'continue',
    codex: 'codex',
    cursor: 'cursor',
    'gemini-cli': 'gemini',
    cline: 'cline',
    windsurf: 'windsurf',
  };
  return map[detectedId] ?? null;
}

export function hookCommand(): Command {
  const cmd = new Command('hook').description(
    'PreToolUse protection for built-in agent tools (Bash/Edit/Write/WebFetch) across platforms'
  );

  cmd
    .command('run')
    .description('Run the tool-call hook (invoked by the host agent; reads stdin)')
    .option('--platform <id>', 'Host platform (claude-code default)', 'claude-code')
    .action(async (opts: { platform?: string }) => {
      const p = (opts.platform ?? 'claude-code') as HookPlatform;
      await runHook(PLATFORMS[p] ? p : 'claude-code');
    });

  cmd
    .command('install')
    .description('Register the hook for a platform (or all hookable detected platforms)')
    .option('--platform <id>', 'A specific platform; omit for all hookable')
    .action((opts: { platform?: string }) => {
      const targets = opts.platform
        ? [opts.platform as HookPlatform].filter((p) => PLATFORMS[p])
        : HOOKABLE_PLATFORMS;
      if (!targets.length) {
        console.log(`  ${c.caution(`Unknown platform: ${opts.platform}`)}`);
        return;
      }
      for (const p of targets) {
        const r = installFor(p);
        const tag =
          r === 'installed'
            ? c.safe('installed')
            : r === 'already'
              ? c.dim('already')
              : c.caution('error');
        console.log(`  ${p.padEnd(12)} ${tag}`);
        // On error, surface WHY (e.g. corrupt config we refused to overwrite)
        // so the user can fix it — never silently skip a data-loss abort.
        if (r === 'error' && lastHookInstallError()) {
          console.log(`  ${''.padEnd(12)} ${c.dim(lastHookInstallError()!)}`);
        }
      }
      console.log(`  ${c.dim('Restart the host agent for the hook to take effect.')}`);
    });

  cmd
    .command('uninstall')
    .description('Remove the PanGuard hook from Claude-style settings')
    .action(() => {
      const settingsPath = claudeSettingsPath();
      const read = readJsonForRoundTrip(settingsPath);
      if (read.kind === 'corrupt') {
        // Same data-loss rule as install: never write over a config we cannot
        // parse. The hook entry may or may not be in there — refuse to guess.
        console.log(
          `  ${c.caution('Cannot uninstall:')} ${c.dim(
            `${settingsPath} is not valid JSON (${read.error}). Fix or back up the file first.`
          )}`
        );
        return;
      }
      const s = (read.kind === 'ok' ? read.data : {}) as ClaudeSettings;
      if (!isHookInstalled(s)) {
        console.log(`  ${c.dim('Hook not installed.')}`);
        return;
      }
      writeJson(settingsPath, withHookRemoved(s));
      console.log(`  ${c.safe('PreToolUse hook removed.')}`);
    });

  cmd
    .command('status')
    .description('Show whether the built-in-tool hook is registered (Claude)')
    .action(() => {
      const settingsPath = claudeSettingsPath();
      const read = readJsonForRoundTrip(settingsPath);
      if (read.kind === 'corrupt') {
        console.log(
          `  ${c.caution('Cannot read settings:')} ${c.dim(
            `${settingsPath} is not valid JSON (${read.error}).`
          )}`
        );
        return;
      }
      const installed = isHookInstalled(
        (read.kind === 'ok' ? read.data : {}) as ClaudeSettings
      );
      console.log(
        installed
          ? `  ${c.safe('Built-in-tool hook ACTIVE')} (Claude). Hookable platforms: ${HOOKABLE_PLATFORMS.join(', ')}.`
          : `  ${c.caution('Built-in-tool hook NOT installed')} — run: pga hook install`
      );
    });

  return cmd;
}
