/**
 * Config integrity + self-removal detection (S5).
 *
 * Tamper-EVIDENCE, not tamper-PREVENTION. A same-privilege local attacker can
 * recompute the machine-derived HMAC key and re-seal a tampered config, so this
 * does NOT stop a targeted attacker. What it DOES catch — turning every case from
 * SILENT to LOUD-and-honest (preserving the S2 honest-status invariant):
 *   - accidental config corruption,
 *   - unsophisticated/automated tampering (a malicious skill that edits
 *     config.json to weaken protection but does not know to re-HMAC the manifest),
 *   - anything that changes the config without also rewriting the sealed manifest,
 *   - removal/disabling of the guard's own LaunchAgent / hooks / proxy injection
 *     (verified by re-checking the presence + content-marker of recorded paths).
 *
 * A real trust root (a key a same-user attacker cannot read — Secure Enclave /
 * keychain ACL, or a server-side seal) is out of scope for the free CLI and noted
 * as future work. Do NOT describe this as "cryptographically protected config";
 * it is "tamper-evident: detects unauthorized changes the guard did not make".
 *
 * @module @panguard-ai/panguard-guard/integrity
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { hostname, userInfo, homedir, platform } from 'node:os';

/**
 * launchd label for the guard's own reboot-persistence service. MUST match
 * SERVICE_LABEL in @panguard-ai/panguard's persist.ts — the two live in
 * separate packages (panguard depends on panguard-guard, not the reverse), so
 * the constant is duplicated here with this contract. A drift would make the
 * self-removal check watch the wrong path. A test in persist pins the value.
 */
export const GUARD_SERVICE_LABEL = 'com.panguard.panguard-guard';

/** Config fields whose silent change weakens protection — the integrity-watched set. */
export const SECURITY_FIELDS = [
  'mode',
  'enforcementPolicy',
  'threatCloudEndpoint',
  'threatCloudRuleSyncEnabled',
  'dashboardEnabled',
  'telemetryEnabled',
  'trustedSkills',
] as const;

const CRITICAL_FIELDS = new Set<string>([
  'mode',
  'enforcementPolicy',
  'threatCloudEndpoint',
  'threatCloudRuleSyncEnabled',
  'trustedSkills',
]);

/** A guard-owned artifact whose presence (and optional content marker) proves the
 *  guard has not been silently removed. Recorded at seal time by the installer. */
export interface SelfStateRef {
  readonly kind: 'launchagent' | 'hook' | 'proxy';
  readonly path: string;
  /** If set, the file must still CONTAIN this substring (e.g. the injected hook command). */
  readonly marker?: string;
  readonly label?: string;
}

export interface IntegrityFinding {
  readonly field: string;
  readonly was: unknown;
  readonly now: unknown;
  readonly severity: 'critical' | 'warn';
}

export interface SelfStateFinding {
  readonly kind: string;
  readonly path: string;
  readonly label?: string;
  readonly reason: 'missing' | 'marker-gone';
}

export type IntegrityStatus = 'sealed' | 'tampered' | 'unsealed' | 'manifest-tampered';

export interface IntegrityVerdict {
  readonly status: IntegrityStatus;
  readonly findings: IntegrityFinding[];
  readonly checkedAt: string;
}

export interface SelfStateVerdict {
  readonly ok: boolean;
  readonly findings: SelfStateFinding[];
}

interface SealedInner {
  version: number;
  sealedAt: string;
  alg: 'hmac-sha256';
  config: { sha256: string; securityFields: Record<string, unknown> };
  selfState: SelfStateRef[];
}

/**
 * Machine-bound HMAC key = sha256(hostname + username + 'panguard-ai'). Deterministic
 * per host/user so the seal verifies across runs without storing a key file. HONEST
 * LIMIT: a same-user attacker can recompute this — see the module header.
 */
function deriveMachineKey(): Buffer {
  return createHash('sha256').update(`${hostname()}\n${userInfo().username}\npanguard-ai`).digest();
}

/**
 * Deterministic JSON with RECURSIVELY sorted keys, so the HMAC is order-stable.
 *
 * CRITICAL: object keys whose value is `undefined` are OMITTED, exactly as
 * JSON.stringify does when the manifest is written to disk. Without this, sealing
 * hashes `{enforcementPolicy: undefined}` as a present key while the persisted
 * file drops it — so verify recomputes a different MAC and reports
 * `manifest-tampered` on a pristine install (any config that leaves a watched
 * security field unset, e.g. the default enforcementPolicy / trustedSkills).
 * Array holes still serialize as null to match JSON.stringify array semantics.
 */
function canonical(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
}

function hmacHex(data: string): string {
  return createHmac('sha256', deriveMachineKey()).update(data).digest('hex');
}

function safeEqHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function nowIso(): string {
  return new Date().toISOString();
}

function securitySnapshot(config: Record<string, unknown>): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  for (const f of SECURITY_FIELDS) snap[f] = config[f];
  return snap;
}

/** Where the sealed manifest lives (0600), next to the config. */
export function manifestPath(dataDir: string): string {
  return join(dataDir, 'config.manifest.json');
}

/**
 * Durable breadcrumb proving the guard sealed at least once. Lets the start path
 * distinguish a TRUE first run (no breadcrumb → safe to auto-seal) from a manifest
 * that was DELETED after a prior seal (breadcrumb present → suspicious; do NOT
 * silently re-seal a possibly-tampered config).
 */
function initMarkerPath(dataDir: string): string {
  return join(dataDir, '.integrity-initialized');
}

export function wasInitialized(dataDir: string): boolean {
  return existsSync(initMarkerPath(dataDir));
}

/**
 * Seal the current config + self-state into the manifest (atomic, 0600). Call this
 * at the END of every LEGITIMATE config write / install so a user's own change
 * re-establishes trust instead of looking like tampering.
 */
export function sealConfigManifest(
  config: Record<string, unknown>,
  selfState: SelfStateRef[],
  dataDir: string
): void {
  const inner: SealedInner = {
    version: 1,
    sealedAt: nowIso(),
    alg: 'hmac-sha256',
    config: { sha256: hmacHex(canonical(config)), securityFields: securitySnapshot(config) },
    selfState,
  };
  const mac = hmacHex(canonical(inner));
  const path = manifestPath(dataDir);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify({ ...inner, mac }, null, 2), { mode: 0o600 });
  renameSync(tmp, path);
  // Durable "has been sealed" breadcrumb (best-effort) so a later manifest deletion
  // is distinguishable from a genuine first run.
  try {
    writeFileSync(initMarkerPath(dataDir), inner.sealedAt, { mode: 0o600 });
  } catch {
    /* best-effort breadcrumb */
  }
}

function readManifest(dataDir: string): (SealedInner & { mac?: string }) | 'absent' | 'unreadable' {
  const path = manifestPath(dataDir);
  if (!existsSync(path)) return 'absent';
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as SealedInner & { mac?: string };
  } catch {
    return 'unreadable';
  }
}

/**
 * Verify the config against its sealed manifest. Never throws.
 *   - no manifest        → 'unsealed' (trust not yet established)
 *   - outer mac bad      → 'manifest-tampered' (the seal itself was rewritten)
 *   - config hmac differs→ 'tampered' (+ the specific security-field deltas)
 *   - all match          → 'sealed'
 */
export function verifyConfigIntegrity(
  config: Record<string, unknown>,
  dataDir: string
): IntegrityVerdict {
  const checkedAt = nowIso();
  const m = readManifest(dataDir);
  if (m === 'absent') return { status: 'unsealed', findings: [], checkedAt };
  if (m === 'unreadable') return { status: 'manifest-tampered', findings: [], checkedAt };
  const { mac, ...inner } = m;
  if (typeof mac !== 'string' || !safeEqHex(mac, hmacHex(canonical(inner)))) {
    return { status: 'manifest-tampered', findings: [], checkedAt };
  }
  const expected = inner.config?.sha256;
  if (typeof expected !== 'string' || !safeEqHex(expected, hmacHex(canonical(config)))) {
    const sealed = inner.config?.securityFields ?? {};
    const findings: IntegrityFinding[] = [];
    for (const f of SECURITY_FIELDS) {
      const was = sealed[f];
      const now = config[f];
      if (canonical(was) !== canonical(now)) {
        findings.push({
          field: f,
          was,
          now,
          severity: CRITICAL_FIELDS.has(f) ? 'critical' : 'warn',
        });
      }
    }
    return { status: 'tampered', findings, checkedAt };
  }
  return { status: 'sealed', findings: [], checkedAt };
}

/**
 * Re-check that every guard-owned artifact recorded at seal time is still present
 * (and still contains its content marker). Detects silent removal of the
 * LaunchAgent / hooks / proxy injection. Never throws.
 */
export function checkSelfState(dataDir: string): SelfStateVerdict {
  const m = readManifest(dataDir);
  if (m === 'absent' || m === 'unreadable') return { ok: true, findings: [] };
  const refs: SelfStateRef[] = Array.isArray(m.selfState) ? m.selfState : [];
  const findings: SelfStateFinding[] = [];
  for (const r of refs) {
    if (!r || typeof r.path !== 'string') continue;
    if (!existsSync(r.path)) {
      findings.push({ kind: r.kind, path: r.path, label: r.label, reason: 'missing' });
      continue;
    }
    if (r.marker) {
      try {
        if (!readFileSync(r.path, 'utf-8').includes(r.marker)) {
          findings.push({ kind: r.kind, path: r.path, label: r.label, reason: 'marker-gone' });
        }
      } catch {
        findings.push({ kind: r.kind, path: r.path, label: r.label, reason: 'missing' });
      }
    }
  }
  return { ok: findings.length === 0, findings };
}

/** Read the self-state refs recorded in the manifest (for re-sealing after a change). */
export function readSelfStateRefs(dataDir: string): SelfStateRef[] {
  const m = readManifest(dataDir);
  if (m === 'absent' || m === 'unreadable') return [];
  return Array.isArray(m.selfState) ? m.selfState : [];
}

/**
 * Discover the guard's own currently-present install artifacts as SelfStateRefs.
 *
 * This is the missing wiring that made self-removal detection dead: every seal
 * recorded an EMPTY selfState, so checkSelfState() always iterated nothing and
 * always returned ok — the guard claimed to notice its own removal but never
 * did. We record only artifacts that EXIST right now (so we never emit a false
 * "missing" for something that was never installed on this platform); merging
 * with the previously-recorded refs (see mergeSelfState) is what preserves a
 * later removal as a detection.
 *
 * Highest-value artifact: the reboot-persistence LaunchAgent. Its removal means
 * protection silently never starts again after the next login. macOS-only for
 * now (that is where the guard installs a user LaunchAgent). Hook / proxy-
 * injection artifacts are recorded by the installers that own their paths.
 */
export function collectSelfState(): SelfStateRef[] {
  const refs: SelfStateRef[] = [];
  if (platform() === 'darwin') {
    const plist = join(homedir(), 'Library', 'LaunchAgents', `${GUARD_SERVICE_LABEL}.plist`);
    if (existsSync(plist)) {
      refs.push({
        kind: 'launchagent',
        path: plist,
        marker: GUARD_SERVICE_LABEL,
        label: 'reboot-persistence service',
      });
    }
  }
  return refs;
}

/**
 * Union two SelfStateRef lists by path, preferring the previously-recorded ref
 * on conflict. CRITICAL: this never DROPS a recorded ref — a recorded artifact
 * that is now missing must stay in the set so checkSelfState() flags its
 * removal. We only ADD newly-present artifacts. Re-sealing with a bare
 * collectSelfState() (which omits anything currently absent) would erase the
 * very removal we exist to detect; merging is what makes a refresh safe.
 */
export function mergeSelfState(
  recorded: readonly SelfStateRef[],
  discovered: readonly SelfStateRef[]
): SelfStateRef[] {
  const byPath = new Map<string, SelfStateRef>();
  for (const r of discovered) {
    if (r && typeof r.path === 'string') byPath.set(r.path, r);
  }
  // Recorded wins on conflict (preserves the original marker/label + presence contract).
  for (const r of recorded) {
    if (r && typeof r.path === 'string') byPath.set(r.path, r);
  }
  return [...byPath.values()];
}

/**
 * Drop recorded refs by kind — the deliberate inverse of mergeSelfState, used
 * ONLY when the guard removes its own artifact on purpose (e.g. `pga guard
 * uninstall` removing the LaunchAgent). A LEGITIMATE removal must rebuild trust,
 * not leave a permanent "missing" that makes checkSelfState flag tamper forever.
 * Without this, once you uninstall the reboot service the manifest keeps its ref
 * (merge never drops), so every subsequent start warns and the dashboard shows
 * TAMPERED with no natural recovery. Callers pass the kind(s) they just removed.
 */
export function forgetSelfState(
  recorded: readonly SelfStateRef[],
  kinds: readonly SelfStateRef['kind'][]
): SelfStateRef[] {
  const drop = new Set(kinds);
  return recorded.filter((r) => r && typeof r.kind === 'string' && !drop.has(r.kind));
}
