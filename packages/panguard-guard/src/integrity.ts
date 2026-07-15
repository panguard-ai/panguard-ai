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
  /**
   * If set, a SHA-256 over the file's SECURITY-RELEVANT fields (not the whole
   * file — plist formatting/comments are irrelevant). checkSelfState recomputes
   * it and flags 'tampered' on mismatch. This catches a hijack that keeps the
   * Label line (so `marker` still matches) but rewrites ProgramArguments to point
   * the reboot-persistence service at attacker code. See plistSecurityHash.
   */
  readonly contentHash?: string;
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
  readonly reason: 'missing' | 'marker-gone' | 'tampered';
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
    let content: string | null = null;
    if (r.marker || r.contentHash) {
      try {
        content = readFileSync(r.path, 'utf-8');
      } catch {
        findings.push({ kind: r.kind, path: r.path, label: r.label, reason: 'missing' });
        continue;
      }
    }
    if (r.marker && content !== null && !content.includes(r.marker)) {
      findings.push({ kind: r.kind, path: r.path, label: r.label, reason: 'marker-gone' });
      continue;
    }
    // Content-hash check: catches a hijack that keeps the marker (e.g. the plist
    // Label) but rewrites the security-relevant fields (e.g. ProgramArguments).
    if (r.contentHash && content !== null && plistSecurityHash(content) !== r.contentHash) {
      findings.push({ kind: r.kind, path: r.path, label: r.label, reason: 'tampered' });
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Hash the SECURITY-RELEVANT fields of a launchd plist so a rewrite of the
 * fields that decide WHAT runs at reboot (ProgramArguments), UNDER WHICH label
 * (Label), and WHEN (RunAtLoad / KeepAlive) is detectable — even if the attacker
 * preserves the Label line the substring marker checks.
 *
 * We deliberately do NOT hash the whole file: plist whitespace, key ordering, and
 * unrelated keys (e.g. StandardOutPath) are not security-relevant and would cause
 * spurious 'tampered' findings on a benign reformat. We extract each field's raw
 * XML slice by tag and hash the concatenation. Extraction is best-effort and
 * order-stable; a field that is absent contributes an empty slice, so ADDING a
 * previously-absent ProgramArguments/KeepAlive also changes the hash.
 */
export function plistSecurityHash(plistXml: string): string {
  const fields = ['Label', 'ProgramArguments', 'RunAtLoad', 'KeepAlive'];
  const parts = fields.map((f) => `${f}=${extractPlistField(plistXml, f)}`);
  return createHash('sha256').update(parts.join('\n')).digest('hex');
}

/**
 * Extract the XML value node that immediately follows `<key>NAME</key>` in a
 * plist, normalized (whitespace collapsed) so cosmetic reformatting does not
 * change the hash but a value change does. Returns '' when the key is absent.
 */
function extractPlistField(plistXml: string, key: string): string {
  const keyRe = new RegExp(`<key>\\s*${key}\\s*</key>\\s*`, 'i');
  const m = keyRe.exec(plistXml);
  if (!m) return '';
  const rest = plistXml.slice(m.index + m[0].length);
  // Self-closing value (<true/>, <false/>) or a paired value node.
  const selfClosing = /^<(true|false)\s*\/>/i.exec(rest);
  if (selfClosing) return selfClosing[0].toLowerCase().replace(/\s+/g, '');
  const paired = /^<([a-zA-Z]+)>([\s\S]*?)<\/\1>/.exec(rest);
  if (!paired) return '';
  const tag = paired[1] ?? '';
  const body = paired[2] ?? '';
  return `${tag}:${body.replace(/\s+/g, ' ').trim()}`;
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
      // Hash the security-relevant plist fields at seal time so a later hijack of
      // ProgramArguments (attacker persistence under our Label) is caught, not
      // just outright removal. Best-effort: an unreadable plist records no hash
      // (presence + marker still guard it).
      let contentHash: string | undefined;
      try {
        contentHash = plistSecurityHash(readFileSync(plist, 'utf-8'));
      } catch {
        /* keep contentHash undefined; presence + marker still apply */
      }
      refs.push({
        kind: 'launchagent',
        path: plist,
        marker: GUARD_SERVICE_LABEL,
        ...(contentHash ? { contentHash } : {}),
        label: 'reboot-persistence service',
      });
    }
  }

  // S4 built-in-tool PreToolUse hook — the primary Bash/Edit/Write/WebFetch
  // interceptor for the agent's own tools. Sealing it as self-state means
  // checkSelfState() catches its removal (marker-gone) so the cockpit can no
  // longer report a healthy posture after the main interceptor is stripped from
  // ~/.claude/settings.json (previously only `pga doctor` caught this). Recorded
  // only when present at seal time, so a guard-only (no-hook) install never
  // false-alarms. Self-contained (reads the JSON directly) to avoid a reverse
  // dependency on the panguard CLI package.
  const claudeSettings = join(homedir(), '.claude', 'settings.json');
  try {
    if (
      existsSync(claudeSettings) &&
      readFileSync(claudeSettings, 'utf-8').includes('pga hook run')
    ) {
      refs.push({
        kind: 'hook',
        path: claudeSettings,
        marker: 'pga hook run',
        label: 'built-in-tool PreToolUse hook',
      });
    }
  } catch {
    /* best-effort — presence of the launchagent still guards the daemon */
  }
  return refs;
}

/**
 * Union two SelfStateRef lists by path. CRITICAL: this never DROPS a recorded
 * ref — a recorded artifact that is now missing must stay in the set so
 * checkSelfState() flags its removal. We ADD newly-present artifacts and, for an
 * artifact present in BOTH lists, REFRESH its integrity fields (marker /
 * contentHash) from the freshly-discovered ref. That refresh is what lets a
 * legitimate re-seal (`pga up` after the user's own change) re-baseline the plist
 * content hash instead of flagging the user's own edit as tampered forever, while
 * a removed artifact (absent from `discovered`) keeps its recorded ref and stays
 * detectable. kind/path/label are pinned from the recorded ref (identity is
 * stable); only the integrity fields track the current on-disk artifact.
 */
export function mergeSelfState(
  recorded: readonly SelfStateRef[],
  discovered: readonly SelfStateRef[]
): SelfStateRef[] {
  const discByPath = new Map<string, SelfStateRef>();
  for (const r of discovered) {
    if (r && typeof r.path === 'string') discByPath.set(r.path, r);
  }
  const byPath = new Map<string, SelfStateRef>();
  // Start from recorded so a removed artifact (not in `discovered`) is preserved.
  for (const r of recorded) {
    if (!r || typeof r.path !== 'string') continue;
    const fresh = discByPath.get(r.path);
    if (fresh) {
      // Present in both: keep recorded identity, refresh integrity fields.
      byPath.set(r.path, {
        kind: r.kind,
        path: r.path,
        ...(fresh.marker !== undefined ? { marker: fresh.marker } : {}),
        ...(fresh.contentHash !== undefined ? { contentHash: fresh.contentHash } : {}),
        ...(r.label !== undefined ? { label: r.label } : {}),
      });
    } else {
      byPath.set(r.path, r);
    }
  }
  // Add newly-present artifacts not previously recorded.
  for (const r of discovered) {
    if (r && typeof r.path === 'string' && !byPath.has(r.path)) byPath.set(r.path, r);
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
