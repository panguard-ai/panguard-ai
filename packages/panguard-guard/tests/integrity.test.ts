/**
 * S5 config-integrity + self-removal detection — unit + ADVERSARIAL tests.
 * A hardening that cannot detect tampering is worse than none, so the adversarial
 * cases (tamper → MUST be detected) are the point of this file.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  sealConfigManifest,
  verifyConfigIntegrity,
  checkSelfState,
  manifestPath,
  collectSelfState,
  mergeSelfState,
  readSelfStateRefs,
  type SelfStateRef,
} from '../src/integrity.js';

const baseConfig = (): Record<string, unknown> => ({
  dataDir: '/tmp/x',
  mode: 'protection',
  enforcementPolicy: { autoBlock: true },
  threatCloudEndpoint: 'https://tc.panguard.ai',
  threatCloudRuleSyncEnabled: false,
  dashboardEnabled: true,
  telemetryEnabled: false,
  trustedSkills: [],
});

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pg-integ-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('config integrity — seal/verify', () => {
  it('seal then verify the same config → sealed, no findings', () => {
    const cfg = baseConfig();
    sealConfigManifest(cfg, [], dir);
    const v = verifyConfigIntegrity(cfg, dir);
    expect(v.status).toBe('sealed');
    expect(v.findings).toHaveLength(0);
  });

  it('no manifest → unsealed', () => {
    expect(verifyConfigIntegrity(baseConfig(), dir).status).toBe('unsealed');
  });

  it('ADVERSARIAL: mode downgraded after seal → tampered + the exact delta', () => {
    sealConfigManifest(baseConfig(), [], dir);
    const tampered = { ...baseConfig(), mode: 'report-only' };
    const v = verifyConfigIntegrity(tampered, dir);
    expect(v.status).toBe('tampered');
    const f = v.findings.find((x) => x.field === 'mode');
    expect(f).toBeTruthy();
    expect(f?.was).toBe('protection');
    expect(f?.now).toBe('report-only');
    expect(f?.severity).toBe('critical');
  });

  it('ADVERSARIAL: each weakening security-field change is detected', () => {
    sealConfigManifest(baseConfig(), [], dir);
    const cases: Array<[string, Record<string, unknown>]> = [
      ['enforcementPolicy', { ...baseConfig(), enforcementPolicy: undefined }],
      ['threatCloudEndpoint', { ...baseConfig(), threatCloudEndpoint: 'https://evil.example.com' }],
      ['threatCloudRuleSyncEnabled', { ...baseConfig(), threatCloudRuleSyncEnabled: true }],
      ['trustedSkills', { ...baseConfig(), trustedSkills: ['malicious-skill'] }],
    ];
    for (const [field, cfg] of cases) {
      const v = verifyConfigIntegrity(cfg, dir);
      expect(v.status, field).toBe('tampered');
      expect(
        v.findings.some((x) => x.field === field),
        field
      ).toBe(true);
    }
  });

  it('ADVERSARIAL: rewriting the manifest hash (stale outer mac) → manifest-tampered', () => {
    sealConfigManifest(baseConfig(), [], dir);
    const path = manifestPath(dir);
    const m = JSON.parse(readFileSync(path, 'utf-8')) as { config: { sha256: string } };
    m.config.sha256 = 'deadbeef'.repeat(8); // attacker forges the inner hash but cannot re-mac
    writeFileSync(path, JSON.stringify(m));
    expect(verifyConfigIntegrity(baseConfig(), dir).status).toBe('manifest-tampered');
  });

  it('re-seal after a legitimate change clears the tamper (no false positive on user edits)', () => {
    sealConfigManifest(baseConfig(), [], dir);
    const changed = { ...baseConfig(), mode: 'report-only' };
    expect(verifyConfigIntegrity(changed, dir).status).toBe('tampered');
    sealConfigManifest(changed, [], dir); // user legitimately re-saved
    expect(verifyConfigIntegrity(changed, dir).status).toBe('sealed');
  });

  it('machine key is deterministic — verify passes on a fresh call', () => {
    sealConfigManifest(baseConfig(), [], dir);
    expect(verifyConfigIntegrity(baseConfig(), dir).status).toBe('sealed');
    expect(verifyConfigIntegrity(baseConfig(), dir).status).toBe('sealed');
  });
});

describe('self-removal detection', () => {
  it('all recorded artifacts present (+ marker) → ok', () => {
    const plist = join(dir, 'com.panguard.panguard-guard.plist');
    const settings = join(dir, 'settings.json');
    writeFileSync(plist, '<plist/>');
    writeFileSync(settings, '{"hooks":{"PreToolUse":[{"command":"pga hook run"}]}}');
    const refs: SelfStateRef[] = [
      { kind: 'launchagent', path: plist },
      { kind: 'hook', path: settings, marker: 'pga hook run' },
    ];
    sealConfigManifest(baseConfig(), refs, dir);
    expect(checkSelfState(dir)).toEqual({ ok: true, findings: [] });
  });

  it('ADVERSARIAL: deleted LaunchAgent → missing finding', () => {
    const plist = join(dir, 'com.panguard.panguard-guard.plist');
    writeFileSync(plist, '<plist/>');
    sealConfigManifest(baseConfig(), [{ kind: 'launchagent', path: plist }], dir);
    rmSync(plist);
    const v = checkSelfState(dir);
    expect(v.ok).toBe(false);
    expect(v.findings[0]).toMatchObject({ kind: 'launchagent', reason: 'missing' });
  });

  it('ADVERSARIAL: hook entry stripped from settings (marker gone) → marker-gone finding', () => {
    const settings = join(dir, 'settings.json');
    writeFileSync(settings, '{"hooks":{"PreToolUse":[{"command":"pga hook run"}]}}');
    sealConfigManifest(
      baseConfig(),
      [{ kind: 'hook', path: settings, marker: 'pga hook run' }],
      dir
    );
    writeFileSync(settings, '{"hooks":{}}'); // attacker removed our hook but kept the file
    const v = checkSelfState(dir);
    expect(v.ok).toBe(false);
    expect(v.findings[0]).toMatchObject({ kind: 'hook', reason: 'marker-gone' });
  });

  it('unsealed (no manifest) → self-state check is ok (nothing recorded yet)', () => {
    expect(existsSync(manifestPath(dir))).toBe(false);
    expect(checkSelfState(dir)).toEqual({ ok: true, findings: [] });
  });
});

describe('self-state discovery + merge (finding #20 — dead self-removal wiring)', () => {
  it('mergeSelfState never DROPS a recorded ref — a removed artifact stays detectable', () => {
    // This is the safety property: re-sealing with a bare collectSelfState() (which
    // omits anything currently absent) would erase the very removal we detect.
    const plistRef: SelfStateRef = { kind: 'launchagent', path: '/x/plist', marker: 'L' };
    expect(mergeSelfState([plistRef], [])).toEqual([plistRef]);
  });

  it('mergeSelfState adds a newly-present artifact', () => {
    const a: SelfStateRef = { kind: 'launchagent', path: '/x/a' };
    const b: SelfStateRef = { kind: 'hook', path: '/x/b' };
    const merged = mergeSelfState([a], [b]);
    expect(merged.map((r) => r.path).sort()).toEqual(['/x/a', '/x/b']);
  });

  it('mergeSelfState: recorded wins on a path conflict (keeps the original marker)', () => {
    const rec: SelfStateRef = { kind: 'launchagent', path: '/x/p', marker: 'ORIG' };
    const disc: SelfStateRef = { kind: 'launchagent', path: '/x/p', marker: 'NEW' };
    expect(mergeSelfState([rec], [disc])).toEqual([rec]);
  });

  it('END-TO-END: a re-seal with merge keeps a removed LaunchAgent flagged as missing', () => {
    const plist = join(dir, 'com.panguard.panguard-guard.plist');
    writeFileSync(plist, '<plist/>');
    sealConfigManifest(baseConfig(), [{ kind: 'launchagent', path: plist, marker: 'x' }], dir);
    rmSync(plist); // attacker removes the persistence service
    // Config-save re-seal path: merge recorded refs with freshly discovered ones
    // (which no longer include the deleted plist). The removal must survive.
    const merged = mergeSelfState(readSelfStateRefs(dir), collectSelfState());
    sealConfigManifest(baseConfig(), merged, dir);
    const v = checkSelfState(dir);
    expect(v.ok).toBe(false);
    expect(v.findings[0]).toMatchObject({ kind: 'launchagent', reason: 'missing' });
  });

  it('collectSelfState records only currently-present artifacts (no false "missing")', () => {
    for (const ref of collectSelfState()) {
      expect(existsSync(ref.path)).toBe(true);
    }
  });
});
