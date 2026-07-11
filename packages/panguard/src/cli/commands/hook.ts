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
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  chmodSync,
  rmSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { c } from '@panguard-ai/core';
import {
  ProxyEvaluator,
  EVALUATION_ERROR_SENTINEL,
} from '@panguard-ai/panguard-mcp-proxy/evaluator';
import {
  readAutoUpdateSettings,
  resolveStagedAutoRules,
} from '@panguard-ai/panguard-guard/auto-rules';

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
  // notebook — MUST precede the write/edit branch: "NotebookEdit" contains
  // "edit", so an earlier edit branch would shadow it and drop the cell source.
  if (t.includes('notebook'))
    return `${str(i['file_path'] ?? i['path'] ?? i['notebook_path'])} ${str(
      i['new_source'] ?? i['source'] ?? i['content']
    )}`.trim();
  // file write / edit / patch — extract EVERY content-bearing field so no write
  // payload is ever dropped: Claude new_string/content, Codex apply_patch `input`,
  // generic patch/diff. Dropping the content here = malicious writes ship blind.
  if (t.includes('write') || t.includes('edit') || t.includes('replace') || t.includes('patch')) {
    const head = str(i['file_path'] ?? i['path'] ?? i['filePath']);
    // MultiEdit carries an `edits: [{ new_string, ... }]` ARRAY — the single
    // scalar fields below are all undefined for it, so without this the entire
    // batched write payload ships unscanned. Concatenate every edit's content.
    const editsArr = Array.isArray(i['edits']) ? (i['edits'] as unknown[]) : [];
    const editsContent = editsArr
      .map((e) => {
        const eo = (e ?? {}) as ToolInput;
        return str(eo['new_string'] ?? eo['content'] ?? eo['new_str'] ?? eo['value']);
      })
      .filter(Boolean)
      .join(' ');
    const scalar = str(
      i['new_string'] ??
        i['content'] ??
        i['new_str'] ??
        i['new_source'] ??
        i['input'] ??
        i['patch'] ??
        i['diff']
    );
    return `${head} ${scalar} ${editsContent}`.trim().replace(/\s+/g, ' ');
  }
  if (t.includes('read')) return str(i['file_path'] ?? i['path'] ?? i['filePath']);
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
    // Use the full arg extraction (contentFromArgs now reads file_path AND the
    // write `content` for write-ish actions, so pre_write_code is scanned on its
    // code, not just the path). Fall back to the raw command_line/file_path only
    // if the action didn't route to a content-bearing branch.
    const content =
      contentFromArgs(action, ti).trim() || str(ti['command_line'] ?? ti['file_path']);
    return content ? { toolName: action || 'command', content } : null;
  }
  if (platform === 'cursor') {
    // beforeMCPExecution → tool_name + tool_input(string); beforeShellExecution
    // → top-level command. Check the MCP tool call FIRST: a stdio-launched MCP
    // server's payload can also carry a top-level `command` (the server's own
    // LAUNCH command), and an earlier `command` branch would scan that static
    // launch string instead of the actual (possibly malicious) tool_input —
    // making MCP scanning a silent no-op for the common stdio case.
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
    if (toolName || Object.keys(input).length) {
      return { toolName: toolName || 'tool', content: contentFromArgs(toolName, input) };
    }
    // No MCP tool call → genuine beforeShellExecution (top-level command).
    if (payload['command'] != null) return { toolName: 'shell', content: str(payload['command']) };
    return null;
  }
  // claude-code / continue / codex / gemini: top-level tool_name + tool_input
  const toolName = str(payload['tool_name']);
  if (!toolName) return null;
  return {
    toolName,
    content: contentFromArgs(toolName, (payload['tool_input'] ?? {}) as ToolInput),
  };
}

/**
 * The proxy evaluator returns a SYNTHETIC deny (matchedRules === ['evaluation-
 * error']) when its OWN evaluation crashed — a fail-closed default that is right
 * for the MCP proxy but wrong for this per-tool-call hook, where it would brick
 * the agent and hand an untrusted crash-inducing rule hard-block power. The hook
 * treats this as an OPERATIONAL error (fail open), never a real block. Pure +
 * exported so the policy is unit-tested independent of the live evaluator.
 */
export function isEvaluationErrorSentinel(r: {
  outcome: string;
  matchedRules?: readonly string[];
}): boolean {
  return (
    r.outcome === 'deny' &&
    r.matchedRules?.length === 1 &&
    r.matchedRules[0] === EVALUATION_ERROR_SENTINEL
  );
}

// ── Output adapters (the security-critical part — byte-exact per host) ───────

export interface Emission {
  readonly stdout?: string;
  readonly stderr?: string;
  readonly exit: number;
}

/**
 * Thrown when we cannot form a VALID host-contract output for a RECOGNIZED
 * protocol (unknown format, invalid verdict, or a self-check failure). The caller
 * turns this into a fail-CLOSED block — never a silent allow.
 */
export class HookContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HookContractError';
  }
}

function safeDecision(
  stdout: string | undefined,
  pred: (o: Record<string, unknown>) => boolean
): boolean {
  if (!stdout) return false;
  try {
    return pred(JSON.parse(stdout) as Record<string, unknown>);
  } catch {
    return false;
  }
}

/**
 * Single source of truth for each host's deny contract, shared by emitFor's
 * runtime self-check AND the golden contract tests (tests/hook-contract.test.ts).
 * `verify` confirms a built emission actually expresses the intended decision for
 * the format — a drifted field name or empty output fails it, converting a silent
 * non-enforcement into a thrown HookContractError.
 */
export const HOST_CONTRACTS: Record<
  OutputFormat,
  {
    readonly denyExit: number;
    readonly usesStdout: boolean;
    verify(e: Emission, v: 'ask' | 'deny'): boolean;
  }
> = {
  claude: {
    denyExit: 0,
    usesStdout: true,
    verify: (e, v) =>
      e.exit === 0 &&
      safeDecision(
        e.stdout,
        (o) =>
          (o['hookSpecificOutput'] as Record<string, unknown> | undefined)?.[
            'permissionDecision'
          ] === v
      ),
  },
  cursor: {
    denyExit: 0,
    usesStdout: true,
    verify: (e, v) => e.exit === 0 && safeDecision(e.stdout, (o) => o['permission'] === v),
  },
  gemini: {
    denyExit: 0,
    usesStdout: true,
    verify: (e, v) => e.exit === 0 && safeDecision(e.stdout, (o) => o['decision'] === v),
  },
  cline: {
    denyExit: 0,
    usesStdout: true,
    verify: (e) => e.exit === 0 && safeDecision(e.stdout, (o) => o['cancel'] === true),
  },
  windsurf: {
    denyExit: 2,
    usesStdout: false,
    verify: (e) => e.exit === 2 && !e.stdout && typeof e.stderr === 'string' && e.stderr.length > 0,
  },
};

/**
 * Build the exact host response for a verdict. ALLOW = abstain (exit 0, no
 * stdout) so we never bypass the host's own permission flow. ASK downgrades to
 * deny on hosts without an ask verdict (codex/cline/windsurf) — safe, never to
 * allow. Pure + exported for testing.
 */
export function emitFor(platform: HookPlatform, verdict: Verdict, reason: string): Emission {
  // Validate the verdict — an unexpected value must never silently produce an
  // empty/garbled emission (which the host would read as allow).
  if (verdict !== 'allow' && verdict !== 'ask' && verdict !== 'deny') {
    throw new HookContractError(`invalid verdict: ${String(verdict)}`);
  }
  const spec = PLATFORMS[platform];
  if (!spec) throw new HookContractError(`unknown platform: ${String(platform)}`);
  if (verdict === 'allow') return { exit: 0 };
  // Downgrade ask→deny where the host has no ask verdict.
  const v: 'ask' | 'deny' = verdict === 'ask' && !spec.ask ? 'deny' : verdict;
  let out: Emission;
  switch (spec.format) {
    case 'claude':
      out = {
        exit: 0,
        stdout: JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: v,
            permissionDecisionReason: reason,
          },
        }),
      };
      break;
    case 'cursor':
      out = {
        exit: 0,
        stdout: JSON.stringify({ permission: v, agent_message: reason, user_message: reason }),
      };
      break;
    case 'gemini':
      out = { exit: 0, stdout: JSON.stringify({ decision: v, reason }) };
      break;
    case 'cline':
      // No ask; deny → cancel:true. (ask already downgraded to deny above.)
      out = { exit: 0, stdout: JSON.stringify({ cancel: true, errorMessage: reason }) };
      break;
    case 'windsurf':
      // No JSON contract: the ONLY non-zero exit we ever emit is exactly 2.
      out = { exit: 2, stderr: reason };
      break;
    default: {
      // Exhaustiveness: a future OutputFormat with no adapter must NOT fall
      // through to a silent allow — it throws and the caller fails CLOSED.
      const _never: never = spec.format;
      throw new HookContractError(`unknown output format: ${String(_never)}`);
    }
  }
  // Self-check: the built output must actually express the decision for this
  // format. A drifted field name or empty output fails here → fail CLOSED.
  if (!HOST_CONTRACTS[spec.format].verify(out, v)) {
    throw new HookContractError(`malformed ${spec.format} emission for verdict "${v}"`);
  }
  return out;
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
        'DEGRADED (allowing all tool calls). Run "pga doctor" / "pga upgrade" to ' +
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
 * Record a contract/protocol fail-CLOSED event in the same status file doctor and
 * the dashboard already read, so a silent-non-enforcement risk becomes visible.
 */
function writeContractMarker(
  platform: string,
  reason: string,
  disposition: 'blocked' | 'allowed' = 'blocked'
): void {
  try {
    const path = hookStatusPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify(
        {
          degraded: true,
          ruleCount: 0,
          reason,
          platform,
          disposition,
          at: new Date().toISOString(),
        },
        null,
        2
      ),
      { mode: 0o600 }
    );
  } catch {
    /* best-effort */
  }
}

/**
 * Contract/protocol failure on the ENFORCEMENT path: fail CLOSED + LOUD, never
 * the silent allow. For a KNOWN platform, emit its best-effort deny AND exit 2 so
 * both JSON-honoring and exit-code-honoring hosts block. For an UNRECOGNIZED
 * protocol we cannot form a valid output, so exit 2 (the most broadly honored
 * block convention) with a screaming stderr line. This is distinct from an
 * operational error (stdin/evaluator), which stays fail-OPEN so a buggy hook
 * never bricks the agent.
 */
function failClosed(platform: HookPlatform | string, reason: string): never {
  process.stderr.write(
    `[panguard-hook] FATAL: cannot express a deny for protocol "${platform}" — ` +
      `FAILING CLOSED (blocking the tool call). ${reason}\n`
  );
  writeContractMarker(String(platform), 'contract-unformable');
  const known = (PLATFORMS as Record<string, PlatformSpec>)[platform as string];
  if (known) {
    try {
      const e = emitFor(platform as HookPlatform, 'deny', `PanGuard: ${reason}`);
      if (e.stdout) process.stdout.write(e.stdout);
    } catch {
      /* fall through to the universal exit-2 block */
    }
  }
  process.exit(2);
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
 * Two OPPOSITE degraded modes share this marker — tell them apart by `reason`:
 * - `degraded: true` with no `reason`: the run loaded 0 rules and allowed every
 *   built-in-tool call (fail-OPEN, no enforcement).
 * - `degraded: true` with a `reason` ('contract-unformable',
 *   'unrecognized-evaluator-outcome'): the hook could not trust its own
 *   protocol/verdict and failed CLOSED — it BLOCKED the tool call.
 */
export function readHookProtectionStatus(): {
  degraded: boolean;
  ruleCount: number;
  at: string;
  reason?: string;
  platform?: string;
  disposition?: 'blocked' | 'allowed';
} | null {
  try {
    const path = hookStatusPath();
    if (!existsSync(path)) return null;
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as {
      degraded?: boolean;
      ruleCount?: number;
      at?: string;
      reason?: string;
      platform?: string;
      disposition?: string;
    };
    return {
      degraded: parsed.degraded === true,
      ruleCount: typeof parsed.ruleCount === 'number' ? parsed.ruleCount : 0,
      at: typeof parsed.at === 'string' ? parsed.at : '',
      ...(typeof parsed.reason === 'string' && parsed.reason ? { reason: parsed.reason } : {}),
      ...(typeof parsed.platform === 'string' && parsed.platform
        ? { platform: parsed.platform }
        : {}),
      ...(parsed.disposition === 'allowed' || parsed.disposition === 'blocked'
        ? { disposition: parsed.disposition }
        : {}),
    };
  } catch {
    return null;
  }
}

/** Read stdin, signalling `truncated` when the payload blew past the cap. A tool
 *  call padded past the cap truncates mid-JSON and would break JSON.parse — under
 *  a blocking posture we must refuse to fail open on that (it is an evasion). */
function readStdin(): Promise<{ data: string; truncated: boolean }> {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) {
      resolve({ data: '', truncated: false });
      return;
    }
    process.stdin.setEncoding('utf-8');
    const CAP = 8_000_000; // real tool-call payloads are tiny; 8MB is generous
    process.stdin.on('data', (chunk) => {
      data += chunk;
      if (data.length > CAP) resolve({ data, truncated: true });
    });
    process.stdin.on('end', () => resolve({ data, truncated: false }));
    process.stdin.on('error', () => resolve({ data, truncated: false }));
  });
}

/** Hook enforcement posture:
 *  - 'advisory' → detect + warn on stderr, NEVER block (pure telemetry).
 *  - 'guarded'  → DEFAULT. Block only hard-deny (critical / high-stable) verdicts;
 *                 stay advisory on lower-confidence 'ask' matches so a false
 *                 positive can never wall off legitimate agent work.
 *  - 'enforce'  → block every deny AND ask verdict (strict). */
export type HookPosture = 'advisory' | 'guarded' | 'enforce';

function resolvePosture(opts: { enforce?: boolean; advisory?: boolean }): HookPosture {
  if (process.env['PANGUARD_HOOK_ENFORCE'] === '1' || opts.enforce) return 'enforce';
  if (process.env['PANGUARD_HOOK_ADVISORY'] === '1' || opts.advisory) return 'advisory';
  return 'guarded';
}

/**
 * The hook. Reads the tool call, evaluates the COMMAND CONTENT, emits the host's
 * exact verdict. Failure handling is split by CAUSE:
 *   - OPERATIONAL error (stdin parse / evaluator load / 0 rules) on a recognized
 *     protocol → fail OPEN (exit 0) + loud stderr — a buggy hook must never brick
 *     the agent (the proxy + daemon remain).
 *   - CONTRACT/PROTOCOL failure (unknown platform, invalid verdict, or a
 *     self-check failure that means we cannot express a deny the host will honor)
 *     → fail CLOSED + loud (exit 2 + best-effort deny) — better to block than to
 *     silently let a flagged tool call run because our output drifted.
 * The windsurf adapter's only non-zero exit is 2 (exit 1 = silent fail-open there).
 */
export async function runHook(
  platform: HookPlatform,
  opts: { enforce?: boolean; advisory?: boolean } = {}
): Promise<void> {
  // Default posture is GUARDED: block only hard-deny verdicts (critical, or
  // high-severity + stable maturity — credential exfil, RCE, SSRF, tool
  // poisoning), and stay advisory on lower-confidence 'ask' matches. Hard-deny is
  // high-confidence and low-FP, so blocking it is real protection; the FP-prone
  // matches never wall off legitimate agent work (the #1 uninstall trigger).
  // --enforce (or PANGUARD_HOOK_ENFORCE=1) blocks 'ask' too; --advisory (or
  // PANGUARD_HOOK_ADVISORY=1) is pure detect-and-warn telemetry.
  const posture = resolvePosture(opts);
  const apply = (e: Emission): never => {
    if (e.stdout) process.stdout.write(e.stdout);
    if (e.stderr) process.stderr.write(e.stderr + '\n');
    process.exit(e.exit);
  };
  try {
    const { data: raw, truncated } = await readStdin();
    // Oversized payload (padded past the reader cap → truncated mid-JSON). Under a
    // blocking posture, refuse to fail open on this evasion vector.
    if (truncated) {
      if (posture === 'advisory') {
        process.stderr.write('[panguard] advisory: oversized tool-call payload not scanned.\n');
        process.exit(0);
      }
      failClosed(platform, 'oversized tool-call payload (possible evasion) — blocked');
    }
    let payload: Record<string, unknown> = {};
    if (raw.trim()) {
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        // Unparseable input on a recognized platform. Malformed JSON cannot be
        // scanned, so under a blocking posture fail CLOSED (never let a payload
        // hide a command behind broken JSON); advisory just warns.
        if (posture === 'advisory') {
          process.stderr.write('[panguard] advisory: unparseable tool-call payload not scanned.\n');
          process.exit(0);
        }
        failClosed(platform, 'unparseable tool-call payload — blocked (fail-closed)');
      }
    }
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
    // Gap A: fold in any auto-pulled rules the daemon has staged (opt-in). A
    // FRESH bundle's rules ADVISE (can surface an 'ask') but cannot hard-deny
    // until the user runs `pga guard trust-updates`; a trusted bundle arms. This
    // is best-effort and never breaks the hook — the bundled ruleset already
    // loaded above is the enforce floor.
    try {
      const s = readAutoUpdateSettings();
      if (s.autoUpdateRules) {
        const staged = resolveStagedAutoRules(s.dataDir, s.autoUpdateTrustedVersion);
        if (staged) await evaluator.loadAutoRules(staged.dir, { adviseOnly: staged.adviseOnly });
      }
    } catch {
      /* auto-rules are additive; a failure here must not affect the enforce path */
    }
    // Neutral tool name so tool_name-existence rules never fire on a built-in
    // tool name; only the command content is judged. 'tool_call' selects the
    // tool_call rule set (shell injection, credential theft, SSRF, RCE) plus
    // mcp_exchange rules — a built-in tool call is neither multi-agent comms
    // nor an LLM prompt, so those rule families are correctly skipped.
    const result = await evaluator.evaluateToolCall(
      'command',
      { input: norm.content },
      'tool_call'
    );

    // Validate the evaluator outcome. An unexpected/unknown value must DENY
    // (fail closed), never fall through to allow.
    const rawOutcome = result.outcome as unknown;
    const outcome: Verdict =
      rawOutcome === 'allow' || rawOutcome === 'ask' || rawOutcome === 'deny' ? rawOutcome : 'deny';
    if (outcome === 'allow') process.exit(0);

    // An INTERNAL ATR-engine crash surfaces from the evaluator as a synthetic
    // deny (matchedRules === ['evaluation-error']) — a fail-closed default that
    // is correct for the MCP proxy but WRONG here: in the per-tool-call hook it
    // would (a) block every subsequent Bash/Edit/Write/Read/WebFetch under the
    // default 'guarded' posture, bricking the agent, and (b) let a crash-inducing
    // (e.g. bad auto-pulled) rule gain hard-block power, bypassing shouldHardDeny
    // and the advise-only cap. This is an OPERATIONAL error, not a flagged match,
    // so per this hook's invariant (operational errors never brick) we fail OPEN
    // — loudly, and record the degraded state so doctor/dashboard surface it.
    if (isEvaluationErrorSentinel(result)) {
      process.stderr.write(
        '[panguard-hook] WARNING: the detection engine failed to evaluate this tool call ' +
          '(operational error) — NOT blocking (fail-open). Protection is degraded; run "pga doctor".\n'
      );
      writeContractMarker(platform, 'evaluation-error-failopen', 'allowed');
      process.exit(0);
    }
    if (outcome !== rawOutcome) {
      // Record the marker with the disposition this posture will ACTUALLY apply:
      // advisory blocks nothing, so an unrecognized outcome is coerced to 'deny'
      // yet still ALLOWED — the marker must not claim it was blocked (doctor and
      // the dashboard word their message from `disposition`).
      const willAllow = posture === 'advisory';
      process.stderr.write(
        `[panguard-hook] WARNING: unrecognized evaluator outcome "${String(rawOutcome)}" — ${
          willAllow ? 'advisory posture: NOT blocking' : 'denying (fail-closed)'
        }.\n`
      );
      writeContractMarker(
        platform,
        'unrecognized-evaluator-outcome',
        willAllow ? 'allowed' : 'blocked'
      );
    }

    const rules = result.matchedRules?.length
      ? ` [${result.matchedRules.slice(0, 3).join(', ')}]`
      : '';
    const reason = `PanGuard: ${result.reason || 'matched a detection rule'}${rules}`;

    // POSTURE gate. `outcome` is a real 'deny' (hard-deny: critical / high-stable)
    // or 'ask' (lower-confidence) verdict here (allow already exited; an
    // unrecognized outcome was coerced to 'deny' above and is gated here too).
    //   guarded (default) → block 'deny', advise 'ask'
    //   enforce           → block both
    //   advisory          → block neither
    // Gap A: an 'ask' driven ONLY by advise-only (fresh, untrusted auto-pulled)
    // rules is NEVER escalated to a block — not even under enforce — so a fresh
    // rule cannot wall off a tool call until the user runs `pga guard
    // trust-updates`. (A 'deny' is always from a trusted rule and still blocks.)
    const adviseOnlyAsk = outcome === 'ask' && result.adviseOnly === true;
    const block =
      !adviseOnlyAsk && (posture === 'enforce' || (posture === 'guarded' && outcome === 'deny'));
    if (!block) {
      // An advise-only ask comes from a FRESH auto-pulled rule that cannot block
      // until trusted — point the user at the arm command, not at --enforce
      // (which deliberately does NOT block it either).
      const hint = adviseOnlyAsk
        ? ' — new auto-pulled rule; run `pga guard trust-updates` to let it block'
        : posture === 'guarded' && outcome === 'ask'
          ? ' — enforce mode (--enforce) would also block lower-confidence matches'
          : '';
      process.stderr.write(`[panguard] advisory (not blocked): ${reason}${hint}\n`);
      process.exit(0);
    }
    // Contract/protocol failures fail CLOSED (emitFor throws HookContractError);
    // they must NOT fall into the operational catch below (which fails open).
    let emission: Emission;
    try {
      emission = emitFor(platform, outcome, reason);
    } catch (e) {
      if (e instanceof HookContractError) failClosed(platform, e.message);
      throw e;
    }
    apply(emission);
  } catch (err) {
    // Operational error (stdin parse, evaluator load, etc.) on a recognized
    // protocol → fail OPEN: a buggy hook must never brick the agent. (Inability
    // to express a deny / unrecognized protocol fails CLOSED above, not here.)
    process.stderr.write(
      `[panguard-hook] operational error (allowing): ${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exit(0);
  }
}

// ── Registration (per-platform config; idempotent, non-clobbering) ───────────

const HOOK_CMD = (p: HookPlatform, posture: HookPosture = 'guarded'): string =>
  `pga hook run --platform ${p}` +
  (posture === 'enforce' ? ' --enforce' : posture === 'advisory' ? ' --advisory' : '');
const TOOL_MATCHER = EVALUATED_TOOLS.join('|');

/**
 * The posture wired into an EXISTING serialized hook registration. The command
 * is `pga hook run --platform <p>[ --enforce | --advisory]`, so the posture is
 * recoverable from any serialization (a JSON.stringify'd settings object or a
 * cline script body). installFor uses this to detect a posture CHANGE on
 * re-install: the bare `pga hook run` prefix check alone would return 'already'
 * and silently keep the OLD posture while the CLI claims the new one is active.
 */
function wiredPosture(serialized: string): HookPosture {
  const m = serialized.match(/pga hook run[^"'\\\n]*/);
  const cmd = m ? m[0] : '';
  if (cmd.includes('--enforce')) return 'enforce';
  if (cmd.includes('--advisory')) return 'advisory';
  return 'guarded';
}

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

/**
 * Is the built-in-tool hook actually installed on the primary host (Claude
 * settings — what `pga up` / `pga hook install` write by default)? Best-effort;
 * false on absent/corrupt settings. Lets `pga doctor` avoid greening a
 * "Built-in-tool hook" check when the hook was never installed at all (a
 * missing degraded-marker alone does NOT prove protection is active).
 */
export function isBuiltinHookInstalled(): boolean {
  try {
    const r = readJsonForRoundTrip(claudeSettingsPath());
    return r.kind === 'ok' && isHookInstalled(r.data as ClaudeSettings);
  } catch {
    return false;
  }
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
export function installFor(
  platform: HookPlatform,
  posture: HookPosture = 'guarded'
): 'installed' | 'updated' | 'already' | 'error' {
  // 'already' means installed AND wired with the SAME posture. A posture change
  // rewrites the entry and returns 'updated' — the old prefix-only idempotence
  // check kept the previous posture while the CLI claimed the new one was live.
  lastInstallError = null;
  try {
    switch (platform) {
      case 'claude-code':
      case 'continue': {
        // Continue reads ~/.claude/settings.json too, so the Claude entry covers both.
        const settingsPath = claudeSettingsPath();
        const base = configOrAbort(settingsPath, 'Claude settings');
        if (base === null) return 'error';
        let s = base as ClaudeSettings;
        let updated = false;
        if (isHookInstalled(s)) {
          if (wiredPosture(JSON.stringify(s)) === posture) return 'already';
          s = withHookRemoved(s);
          updated = true;
        }
        // withHookInstalled spreads `s`, preserving permissions/env/model/MCP keys.
        writeJson(settingsPath, withHookInstalled(s, HOOK_CMD('claude-code', posture)));
        return updated ? 'updated' : 'installed';
      }
      case 'codex': {
        const path = join(homedir(), '.codex', 'hooks.json');
        const base = configOrAbort(path, 'Codex hooks');
        if (base === null) return 'error';
        let s = base as ClaudeSettings;
        let updated = false;
        if (isHookInstalled(s)) {
          if (wiredPosture(JSON.stringify(s)) === posture) return 'already';
          s = withHookRemoved(s);
          updated = true;
        }
        const hooks = { ...(s.hooks ?? {}) };
        const pre = Array.isArray(hooks.PreToolUse) ? [...hooks.PreToolUse] : [];
        pre.push({
          matcher: 'Bash|apply_patch',
          hooks: [{ type: 'command', command: HOOK_CMD('codex', posture) }],
        });
        writeJson(path, { ...s, hooks: { ...hooks, PreToolUse: pre } });
        return updated ? 'updated' : 'installed';
      }
      case 'gemini': {
        const path = join(homedir(), '.gemini', 'settings.json');
        const base = configOrAbort(path, 'Gemini settings');
        if (base === null) return 'error';
        const s = base as { hooks?: { BeforeTool?: unknown[] }; [k: string]: unknown };
        let before = Array.isArray(s.hooks?.BeforeTool)
          ? [...(s.hooks!.BeforeTool as unknown[])]
          : [];
        let updated = false;
        if (JSON.stringify(before).includes('pga hook run')) {
          if (wiredPosture(JSON.stringify(before)) === posture) return 'already';
          before = before.filter((e) => !JSON.stringify(e ?? null).includes('pga hook run'));
          updated = true;
        }
        before.push({
          matcher: 'run_shell_command|write_file|replace',
          hooks: [
            {
              name: 'panguard-atr',
              type: 'command',
              command: HOOK_CMD('gemini', posture),
              timeout: 10000,
            },
          ],
        });
        writeJson(path, { ...s, hooks: { ...(s.hooks ?? {}), BeforeTool: before } });
        return updated ? 'updated' : 'installed';
      }
      case 'cursor': {
        const path = join(homedir(), '.cursor', 'hooks.json');
        const base = configOrAbort(path, 'Cursor hooks');
        if (base === null) return 'error';
        const s = base as { version?: number; hooks?: Record<string, unknown[]> };
        const hooks = { ...(s.hooks ?? {}) };
        let updated = false;
        if (JSON.stringify(hooks).includes('pga hook run')) {
          if (wiredPosture(JSON.stringify(hooks)) === posture) return 'already';
          for (const ev of Object.keys(hooks)) {
            const arr = hooks[ev];
            if (Array.isArray(arr))
              hooks[ev] = arr.filter((e) => !JSON.stringify(e ?? null).includes('pga hook run'));
          }
          updated = true;
        }
        for (const ev of ['beforeShellExecution', 'beforeMCPExecution']) {
          const arr = Array.isArray(hooks[ev]) ? [...(hooks[ev] as unknown[])] : [];
          // failClosed must stay FALSE: if the `pga` binary is later removed
          // (uninstall / npm-remove) but this config entry survives, a
          // failClosed:true hook makes Cursor DENY every tool call when it
          // cannot exec the missing command — bricking the agent. Failing OPEN
          // means an orphaned hook degrades to no-protection (loud, recoverable)
          // instead of a hard deny. Our own runHook is already fail-safe and
          // never relies on the host's failClosed flag for enforcement.
          arr.push({ command: HOOK_CMD('cursor', posture), failClosed: false });
          hooks[ev] = arr;
        }
        writeJson(path, { version: 1, ...s, hooks });
        return updated ? 'updated' : 'installed';
      }
      case 'windsurf': {
        const path = join(homedir(), '.codeium', 'windsurf', 'hooks.json');
        const base = configOrAbort(path, 'Windsurf hooks');
        if (base === null) return 'error';
        const s = base as { hooks?: Record<string, unknown[]> };
        const hooks = { ...(s.hooks ?? {}) };
        let updated = false;
        if (JSON.stringify(hooks).includes('pga hook run')) {
          if (wiredPosture(JSON.stringify(hooks)) === posture) return 'already';
          for (const ev of Object.keys(hooks)) {
            const arr = hooks[ev];
            if (Array.isArray(arr))
              hooks[ev] = arr.filter((e) => !JSON.stringify(e ?? null).includes('pga hook run'));
          }
          updated = true;
        }
        for (const ev of ['pre_run_command', 'pre_write_code', 'pre_mcp_tool_use']) {
          const arr = Array.isArray(hooks[ev]) ? [...(hooks[ev] as unknown[])] : [];
          arr.push({ command: HOOK_CMD('windsurf', posture), show_output: true });
          hooks[ev] = arr;
        }
        writeJson(path, { ...s, hooks });
        return updated ? 'updated' : 'installed';
      }
      case 'cline': {
        // Filename-based: an executable named after the event. macOS/Linux only.
        // Not a JSON round-trip — the file is our own script, so there is no user
        // config to clobber; we only skip if it already references our hook with
        // the SAME posture (a posture change rewrites our own script).
        const dir = join(homedir(), 'Documents', 'Cline', 'Rules', 'Hooks');
        const file = join(dir, 'PreToolUse');
        let updated = false;
        if (existsSync(file)) {
          const body = readFileSync(file, 'utf-8');
          if (body.includes('pga hook run')) {
            if (wiredPosture(body) === posture) return 'already';
            updated = true;
          }
        }
        mkdirSync(dir, { recursive: true });
        writeFileSync(file, `#!/usr/bin/env bash\nexec ${HOOK_CMD('cline', posture)}\n`, {
          mode: 0o755,
        });
        chmodSync(file, 0o755);
        return updated ? 'updated' : 'installed';
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
  return r === 'installed' || r === 'updated' ? 'installed' : 'already';
}

/**
 * Strip every PanGuard hook entry from one platform's config — the symmetric
 * inverse of installFor. `install` (no flag) writes hooks across ~7 platforms;
 * `uninstall` must be able to remove them all, or an orphaned failClosed hook
 * left behind after `npm remove` can DENY every tool call and brick the agent.
 *
 * DATA-LOSS SAFETY mirrors installFor: a config that exists but cannot be parsed
 * is treated as 'error' and NEVER overwritten (we'd wipe the user's other
 * settings). 'absent' means there is nothing to remove. We only ever filter out
 * entries whose command references `pga hook run`, preserving every other hook.
 */
export function uninstallFor(platform: HookPlatform): 'removed' | 'absent' | 'error' {
  lastInstallError = null;
  try {
    // Helper: detect our entries inside an arbitrary host hook array by string.
    const references = (v: unknown): boolean => JSON.stringify(v ?? null).includes('pga hook run');
    const filterArr = (arr: unknown[]): unknown[] => arr.filter((e) => !references(e));

    switch (platform) {
      case 'claude-code':
      case 'continue': {
        // Both read ~/.claude/settings.json; the Claude entry covers both.
        const path = claudeSettingsPath();
        const r = readJsonForRoundTrip(path);
        if (r.kind === 'corrupt') {
          lastInstallError = `Claude settings (${path}) is not valid JSON (${r.error}). PanGuard did NOT modify it.`;
          return 'error';
        }
        if (r.kind === 'absent') return 'absent';
        const s = r.data as ClaudeSettings;
        if (!isHookInstalled(s)) return 'absent';
        writeJson(path, withHookRemoved(s));
        return 'removed';
      }
      case 'codex': {
        const path = join(homedir(), '.codex', 'hooks.json');
        const r = readJsonForRoundTrip(path);
        if (r.kind === 'corrupt') {
          lastInstallError = `Codex hooks (${path}) is not valid JSON (${r.error}). PanGuard did NOT modify it.`;
          return 'error';
        }
        if (r.kind === 'absent') return 'absent';
        const s = r.data as ClaudeSettings;
        if (!isHookInstalled(s)) return 'absent';
        writeJson(path, withHookRemoved(s));
        return 'removed';
      }
      case 'gemini': {
        const path = join(homedir(), '.gemini', 'settings.json');
        const r = readJsonForRoundTrip(path);
        if (r.kind === 'corrupt') {
          lastInstallError = `Gemini settings (${path}) is not valid JSON (${r.error}). PanGuard did NOT modify it.`;
          return 'error';
        }
        if (r.kind === 'absent') return 'absent';
        const s = r.data as { hooks?: { BeforeTool?: unknown[] }; [k: string]: unknown };
        const before = Array.isArray(s.hooks?.BeforeTool) ? (s.hooks!.BeforeTool as unknown[]) : [];
        if (!before.some(references)) return 'absent';
        const filtered = filterArr(before);
        writeJson(path, { ...s, hooks: { ...(s.hooks ?? {}), BeforeTool: filtered } });
        return 'removed';
      }
      case 'cursor': {
        const path = join(homedir(), '.cursor', 'hooks.json');
        const r = readJsonForRoundTrip(path);
        if (r.kind === 'corrupt') {
          lastInstallError = `Cursor hooks (${path}) is not valid JSON (${r.error}). PanGuard did NOT modify it.`;
          return 'error';
        }
        if (r.kind === 'absent') return 'absent';
        const s = r.data as { version?: number; hooks?: Record<string, unknown[]> };
        const hooks = { ...(s.hooks ?? {}) };
        if (!JSON.stringify(hooks).includes('pga hook run')) return 'absent';
        for (const ev of ['beforeShellExecution', 'beforeMCPExecution']) {
          if (Array.isArray(hooks[ev])) hooks[ev] = filterArr(hooks[ev] as unknown[]);
        }
        writeJson(path, { ...s, hooks });
        return 'removed';
      }
      case 'windsurf': {
        const path = join(homedir(), '.codeium', 'windsurf', 'hooks.json');
        const r = readJsonForRoundTrip(path);
        if (r.kind === 'corrupt') {
          lastInstallError = `Windsurf hooks (${path}) is not valid JSON (${r.error}). PanGuard did NOT modify it.`;
          return 'error';
        }
        if (r.kind === 'absent') return 'absent';
        const s = r.data as { hooks?: Record<string, unknown[]> };
        const hooks = { ...(s.hooks ?? {}) };
        if (!JSON.stringify(hooks).includes('pga hook run')) return 'absent';
        for (const ev of ['pre_run_command', 'pre_write_code', 'pre_mcp_tool_use']) {
          if (Array.isArray(hooks[ev])) hooks[ev] = filterArr(hooks[ev] as unknown[]);
        }
        writeJson(path, { ...s, hooks });
        return 'removed';
      }
      case 'cline': {
        // Filename-based: our own executable script. Safe to remove only when it
        // is actually ours (references our hook), never a user-authored script.
        const file = join(homedir(), 'Documents', 'Cline', 'Rules', 'Hooks', 'PreToolUse');
        if (!existsSync(file)) return 'absent';
        if (!readFileSync(file, 'utf-8').includes('pga hook run')) return 'absent';
        rmSync(file);
        return 'removed';
      }
    }
  } catch (err) {
    lastInstallError = err instanceof Error ? err.message : String(err);
    return 'error';
  }
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
    // No default: we must distinguish "absent" (legitimate claude-code default,
    // used by `pga up`) from an EXPLICIT but unknown value (must fail closed, not
    // silently emit Claude JSON to a non-Claude host = a silent allow).
    .option('--platform <id>', 'Host platform (claude-code if omitted)')
    .option(
      '--enforce',
      'Strict: block every flagged tool call (deny AND lower-confidence ask matches).'
    )
    .option(
      '--advisory',
      'Detect-only: warn on stderr, never block (pure telemetry). Default is guarded: block critical/high-confidence deny verdicts, advise the rest.'
    )
    .action(async (opts: { platform?: string; enforce?: boolean; advisory?: boolean }) => {
      const postureOpts = { enforce: opts.enforce === true, advisory: opts.advisory === true };
      if (opts.platform == null) {
        await runHook('claude-code', postureOpts);
        return;
      }
      if (!(PLATFORMS as Record<string, PlatformSpec>)[opts.platform]) {
        failClosed(opts.platform, `unknown --platform "${opts.platform}"`);
      }
      await runHook(opts.platform as HookPlatform, postureOpts);
    });

  cmd
    .command('install')
    .description('Register the hook for a platform (or all hookable detected platforms)')
    .option('--platform <id>', 'A specific platform; omit for all hookable')
    .option('--enforce', 'Strict posture: block deny AND lower-confidence ask matches.')
    .option('--advisory', 'Detect-only posture: warn, never block (pure telemetry).')
    .action((opts: { platform?: string; enforce?: boolean; advisory?: boolean }) => {
      const posture: HookPosture = opts.enforce
        ? 'enforce'
        : opts.advisory
          ? 'advisory'
          : 'guarded';
      const targets = opts.platform
        ? [opts.platform as HookPlatform].filter((p) => PLATFORMS[p])
        : HOOKABLE_PLATFORMS;
      if (!targets.length) {
        console.log(`  ${c.caution(`Unknown platform: ${opts.platform}`)}`);
        return;
      }
      const results: string[] = [];
      for (const p of targets) {
        const r = installFor(p, posture);
        results.push(r);
        const tag =
          r === 'installed'
            ? c.safe('installed')
            : r === 'updated'
              ? c.safe('updated')
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
      // Be HONEST about the posture that was actually wired — never imply
      // blocking the user didn't opt into, nor hide that guarded blocks criticals.
      // Accurate for every non-error result: 'installed'/'updated' just wrote
      // this posture, and 'already' now means the SAME posture was verified
      // (a posture change returns 'updated', never 'already'). All-error runs
      // wired nothing, so claim nothing.
      if (results.some((r) => r !== 'error')) {
        const postureLine =
          posture === 'enforce'
            ? 'Posture: ENFORCE — every flagged tool call is blocked.'
            : posture === 'advisory'
              ? 'Posture: ADVISORY — threats are detected and logged, never blocked. Re-run with --enforce to block.'
              : 'Posture: GUARDED — critical/high-confidence threats are BLOCKED; lower-confidence matches are advisory. Use --enforce to block those too, or --advisory for detect-only.';
        console.log(`  ${c.dim(postureLine)}`);
        console.log(`  ${c.dim('Restart the host agent for the hook to take effect.')}`);
      }
    });

  cmd
    .command('uninstall')
    .description('Remove the PanGuard hook (all hookable platforms by default)')
    .option('--platform <id>', 'A specific platform; omit for all hookable')
    .option('--all', 'Remove from every hookable platform (default)')
    .action((opts: { platform?: string; all?: boolean }) => {
      // Default to ALL hookable platforms, mirroring `install`. `install` (no
      // flag) wires ~7 platforms, so `uninstall` (no flag) must strip all of
      // them — otherwise an orphaned hook (e.g. Cursor) is left behind to brick
      // the agent after the `pga` binary is gone.
      const targets = opts.platform
        ? [opts.platform as HookPlatform].filter((p) => PLATFORMS[p])
        : HOOKABLE_PLATFORMS;
      if (!targets.length) {
        console.log(`  ${c.caution(`Unknown platform: ${opts.platform}`)}`);
        return;
      }
      let removed = 0;
      for (const p of targets) {
        const r = uninstallFor(p);
        const tag =
          r === 'removed'
            ? c.safe('removed')
            : r === 'absent'
              ? c.dim('not installed')
              : c.caution('error');
        if (r === 'removed') removed++;
        console.log(`  ${p.padEnd(12)} ${tag}`);
        // On error, surface WHY (e.g. corrupt config we refused to overwrite).
        if (r === 'error' && lastHookInstallError()) {
          console.log(`  ${''.padEnd(12)} ${c.dim(lastHookInstallError()!)}`);
        }
      }
      console.log(
        removed > 0
          ? `  ${c.dim('Restart the host agent for the change to take effect.')}`
          : `  ${c.dim('Nothing to remove.')}`
      );
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
      const installed = isHookInstalled((read.kind === 'ok' ? read.data : {}) as ClaudeSettings);
      console.log(
        installed
          ? `  ${c.safe('Built-in-tool hook ACTIVE')} (Claude). Hookable platforms: ${HOOKABLE_PLATFORMS.join(', ')}.`
          : `  ${c.caution('Built-in-tool hook NOT installed')} — run: pga hook install`
      );
    });

  return cmd;
}
