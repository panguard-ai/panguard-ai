/**
 * Safety rules for auto-response actions
 * @module @panguard-ai/panguard-guard/agent/respond/safety-rules
 */

import type { EnforcementPolicy } from '../../types.js';

export const SAFETY_RULES = {
  whitelistedIPs: new Set(['127.0.0.1', '::1', 'localhost', '0.0.0.0']),

  protectedProcesses: new Set([
    'sshd',
    'systemd',
    'init',
    'launchd',
    'loginwindow',
    'explorer.exe',
    'svchost.exe',
    'csrss.exe',
    'lsass.exe',
    'services.exe',
    'winlogon.exe',
    'wininit.exe',
    'panguard-guard',
    'node',
  ]),

  protectedAccounts: new Set(['root', 'Administrator', 'admin', 'SYSTEM', 'LocalSystem']),

  /** Default auto-unblock duration: 1 hour */
  defaultBlockDurationMs: 60 * 60 * 1000,

  /** Extended block duration for repeat offenders: 24 hours */
  repeatOffenderBlockDurationMs: 24 * 60 * 60 * 1000,

  /** SIGKILL timeout after SIGTERM: 5 seconds */
  sigkillTimeoutMs: 5000,

  /** Network isolation requires confidence >= 95 */
  networkIsolationMinConfidence: 95,

  /** Violations before escalation */
  escalationThreshold: 3,
} as const;

/**
 * Conservative default enforcement policy.
 *
 * All destructive actions OFF. Operators must opt in explicitly via
 * `GuardConfig.enforcementPolicy` to enable any OS-level enforcement.
 *
 * Rationale: a guard that mis-identifies a threat and kills the wrong process,
 * blocks the wrong IP, or moves `~/.ssh/authorized_keys` to quarantine causes
 * customer-visible damage that is unrecoverable without manual intervention.
 * Defaulting to OFF eliminates that failure mode in production deployments
 * that have not explicitly reviewed the enforcement surface.
 */
export const DEFAULT_ENFORCEMENT_POLICY: EnforcementPolicy = {
  blockIPs: { enabled: false },
  killProcesses: { enabled: false, allowedProcessNames: [] },
  isolateFiles: { enabled: false, allowedPaths: [] },
  disableAccounts: { enabled: false },
};

/**
 * Permissive enforcement policy preserving pre-policy behaviour.
 *
 * Intended ONLY for:
 * - Unit tests that exercise the OS-action code paths
 * - Existing deployments migrating from older versions that want to retain
 *   the previous "everything-enabled" behaviour until they can scope their
 *   allowlists properly
 *
 * The `'*'` patterns match any process name / path. Account disabling stays
 * OFF even here, because it is too destructive to enable by default in any
 * non-explicit configuration.
 *
 * New deployments should NOT use this — define an explicit `EnforcementPolicy`
 * scoped to the actions and targets the operator has approved.
 */
export const PERMISSIVE_ENFORCEMENT_POLICY: EnforcementPolicy = {
  blockIPs: { enabled: true },
  killProcesses: { enabled: true, allowedProcessNames: ['*'] },
  isolateFiles: { enabled: true, allowedPaths: ['/'] },
  disableAccounts: { enabled: false },
};

/**
 * Match a process name against a glob allowlist.
 * Supports `*` wildcard. Returns true if any pattern matches.
 *
 * @param name Process name to check (e.g. "panguard-skill-runner-123")
 * @param patterns Allowlist patterns (e.g. ["panguard-skill-*", "node-worker"])
 */
export function matchesProcessAllowlist(
  name: string,
  patterns: ReadonlyArray<string>
): boolean {
  if (patterns.length === 0) return false;
  for (const pattern of patterns) {
    const regex = new RegExp(
      '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
    );
    if (regex.test(name)) return true;
  }
  return false;
}

/**
 * Check whether a file path is within the configured isolation allowlist.
 * Resolves `~` to the user's home directory in patterns. Returns true only
 * if the resolved file path is a child of at least one allowed path.
 *
 * NOTE: this replaces the older `$HOME`-wide allowance. Operators must
 * specify exact subdirectories (e.g. `~/Downloads/`) — wildcards on home
 * are not supported, because the failure mode of an over-permissive
 * isolation policy is catastrophic.
 */
export function matchesFilePathAllowlist(
  filePath: string,
  allowedPaths: ReadonlyArray<string>,
  home: string
): boolean {
  if (allowedPaths.length === 0) return false;
  for (const pattern of allowedPaths) {
    const expanded = pattern.startsWith('~/') ? `${home}/${pattern.slice(2)}` : pattern;
    const normalized = expanded.endsWith('/') ? expanded : expanded + '/';
    if (filePath === expanded || filePath.startsWith(normalized)) return true;
  }
  return false;
}
