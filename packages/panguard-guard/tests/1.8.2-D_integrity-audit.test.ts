/**
 * 1.8.2 audit remediation — group D (integrity + audit) adversarial tests.
 *
 * A hardening that "looks done" but does not detect tampering — or that corrupts
 * the very records it protects — is worse than none. Every test here asserts the
 * BAD behavior each finding described CANNOT recur:
 *   - F11: a plist ProgramArguments hijack that keeps the Label MUST be detected.
 *   - F12: a log whose genesis file was legitimately retained away MUST verify OK
 *          (not be misreported TAMPERED), while real tampering after the floor is
 *          still caught.
 *   - F14: the exported username pseudonym MUST be per-install salted (not the old
 *          reversible unsalted digest) and MUST NOT leak the raw username.
 *   - F15: a secret embedded in monitored event content MUST NOT persist in the
 *          durable log, and scrubbing MUST NOT corrupt non-plain (Date) fields.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import type { SecurityEvent } from '@panguard-ai/core';
import {
  sealConfigManifest,
  checkSelfState,
  plistSecurityHash,
  GUARD_SERVICE_LABEL,
  type SelfStateRef,
} from '../src/integrity.js';
import {
  computeHash,
  signHmac,
  verifyChain,
  GENESIS_HASH,
  AuditChain,
  type ChainedRecord,
  type RetentionFloor,
} from '../src/audit/index.js';
import { scrubSecretValues, SECRET_MASK } from '../src/agent/scrub-secrets.js';
import { ReportAgent } from '../src/agent/report-agent.js';
import { createEmptyBaseline } from '../src/memory/baseline.js';
import type { ThreatVerdict } from '../src/types.js';

const KEY = randomBytes(32);

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pg-1.8.2-D-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// F11 — plist self-state: ProgramArguments hijack under a preserved Label.
// ---------------------------------------------------------------------------

function buildPlist(programArgs: string[], stdout = '/tmp/pg.log'): string {
  const args = programArgs.map((a) => `    <string>${a}</string>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${GUARD_SERVICE_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${args}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${stdout}</string>
</dict>
</plist>`;
}

const legitArgs = ['/usr/local/bin/node', '/opt/panguard/guard.js'];

describe('F11 plistSecurityHash: only security-relevant fields drive the hash', () => {
  it('changing ProgramArguments changes the hash', () => {
    const a = plistSecurityHash(buildPlist(legitArgs));
    const b = plistSecurityHash(buildPlist(['/usr/local/bin/node', '/tmp/evil.js']));
    expect(a).not.toBe(b);
  });

  it('changing a non-security field (StandardOutPath) does NOT change the hash', () => {
    const a = plistSecurityHash(buildPlist(legitArgs, '/tmp/pg.log'));
    const b = plistSecurityHash(buildPlist(legitArgs, '/var/log/other.log'));
    expect(a).toBe(b);
  });

  it('cosmetic whitespace reformat does NOT change the hash', () => {
    const canonical = buildPlist(legitArgs);
    const reformatted = canonical
      .replace('<array>\n', '<array>\n\n')
      .replace('  </array>', '        </array>');
    expect(plistSecurityHash(reformatted)).toBe(plistSecurityHash(canonical));
  });
});

describe('F11 checkSelfState: hijack keeping the Label is flagged tampered', () => {
  const sealWith = (plistPath: string): void => {
    const refs: SelfStateRef[] = [
      {
        kind: 'launchagent',
        path: plistPath,
        marker: GUARD_SERVICE_LABEL,
        contentHash: plistSecurityHash(readFileSync(plistPath, 'utf-8')),
        label: 'reboot-persistence service',
      },
    ];
    sealConfigManifest({ mode: 'protection' }, refs, dir);
  };

  it('detects a ProgramArguments rewrite that preserves the Label marker', () => {
    const plistPath = join(dir, 'guard.plist');
    writeFileSync(plistPath, buildPlist(legitArgs));
    sealWith(plistPath);

    // Attacker keeps the <string>com.panguard...</string> Label (marker survives)
    // but repoints ProgramArguments at their own persistence script.
    writeFileSync(plistPath, buildPlist(['/usr/local/bin/node', '/tmp/evil.js']));

    const verdict = checkSelfState(dir);
    expect(verdict.ok).toBe(false);
    expect(verdict.findings.some((f) => f.reason === 'tampered')).toBe(true);
    // The Label marker is intact, so this must NOT be reported as marker-gone.
    expect(verdict.findings.every((f) => f.reason !== 'marker-gone')).toBe(true);
  });

  it('an unchanged plist verifies clean', () => {
    const plistPath = join(dir, 'guard.plist');
    writeFileSync(plistPath, buildPlist(legitArgs));
    sealWith(plistPath);
    expect(checkSelfState(dir).ok).toBe(true);
  });

  it('outright removal is still flagged missing', () => {
    const plistPath = join(dir, 'guard.plist');
    writeFileSync(plistPath, buildPlist(legitArgs));
    sealWith(plistPath);
    rmSync(plistPath);
    const verdict = checkSelfState(dir);
    expect(verdict.ok).toBe(false);
    expect(verdict.findings.some((f) => f.reason === 'missing')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// F12 — retention floor: legitimately-retained genesis must not read TAMPERED.
// ---------------------------------------------------------------------------

function buildChain(n: number, key: Buffer): ChainedRecord[] {
  const recs: ChainedRecord[] = [];
  let prevHash = GENESIS_HASH;
  for (let seq = 0; seq < n; seq++) {
    const ts = new Date(1_700_000_000_000 + seq * 1000).toISOString();
    const payload = { i: seq };
    const hash = computeHash(prevHash, seq, ts, payload);
    recs.push({ seq, ts, payload, prevHash, hash, hmac: signHmac(hash, key) });
    prevHash = hash;
  }
  return recs;
}

describe('F12 verifyChain: retention floor accepts a legit mid-chain start', () => {
  it('without a floor, a dropped-genesis chain reads as hash-break at index 0', () => {
    const survivors = buildChain(8, KEY).slice(3);
    const res = verifyChain(survivors, KEY);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('hash-break');
    expect(res.firstBadIndex).toBe(0);
  });

  it('with the matching floor, the same untampered chain verifies OK', () => {
    const survivors = buildChain(8, KEY).slice(3);
    const floor: RetentionFloor = { seq: survivors[0].seq, prevHash: survivors[0].prevHash };
    const res = verifyChain(survivors, KEY, floor);
    expect(res.ok).toBe(true);
    expect(res.reason).toBe('ok');
  });

  it('the floor cannot mask real tampering AFTER the boundary', () => {
    const survivors = buildChain(8, KEY).slice(3);
    const floor: RetentionFloor = { seq: survivors[0].seq, prevHash: survivors[0].prevHash };
    // Corrupt a record's payload past the floor: the chain must still break there.
    const tampered = survivors.map((r, i) => (i === 2 ? { ...r, payload: { i: 999 } } : r));
    const res = verifyChain(tampered, KEY, floor);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('hash-break');
    expect(res.firstBadIndex).toBe(2);
  });

  it('a floor whose prevHash does not match the first survivor is rejected (no blind accept)', () => {
    const survivors = buildChain(8, KEY).slice(3);
    const badFloor: RetentionFloor = { seq: survivors[0].seq, prevHash: 'f'.repeat(64) };
    const res = verifyChain(survivors, KEY, badFloor);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('hash-break');
  });
});

describe('F12 AuditChain: recordRetentionFloor repairs a retained chain', () => {
  it('verify flips from tampered to OK once the retention floor is recorded', async () => {
    const logPath = join(dir, 'events.jsonl');
    const chain = new AuditChain(logPath, { key: KEY });
    for (let i = 0; i < 6; i++) chain.append({ i });

    // Simulate retention deleting the segment that held seq 0..2.
    const lines = readFileSync(logPath, 'utf-8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as ChainedRecord);
    const kept = lines.slice(3);
    writeFileSync(logPath, kept.map((r) => JSON.stringify(r)).join('\n') + '\n');

    const chain2 = new AuditChain(logPath, { key: KEY });
    const before = await chain2.verify();
    expect(before.ok).toBe(false); // non-genesis start looks tampered without a floor

    chain2.recordRetentionFloor();
    const after = await chain2.verify();
    expect(after.ok).toBe(true);
    expect(after.reason).toBe('ok');

    const head = JSON.parse(readFileSync(logPath + '.head', 'utf-8')) as { floor?: RetentionFloor };
    expect(head.floor?.seq).toBe(kept[0].seq);
  });
});

describe('F12 ReportAgent: enforceRetention wires recordRetentionFloor', () => {
  it('a rotated+retained log still verifies OK end-to-end', async () => {
    const logPath = join(dir, 'events.jsonl');
    // 1-byte size + 1 rotated file forces retention to delete the seq-0 file fast.
    const agent = new ReportAgent(
      logPath,
      'protection',
      { maxFileSizeBytes: 1, maxRotatedFiles: 1, retentionDays: 90 },
      KEY
    );
    const verdict: ThreatVerdict = {
      conclusion: 'benign',
      confidence: 10,
      reasoning: 'test',
      evidence: [],
      recommendedAction: 'notify',
    };
    const response = {
      action: 'notify' as const,
      success: true,
      details: 'test',
      timestamp: new Date().toISOString(),
    };
    const baseline = createEmptyBaseline();
    for (let i = 0; i < 6; i++) {
      agent.report(makeEvent({ id: `evt-${i}` }), verdict, response, baseline);
    }

    const v = await agent.verify();
    expect(v.ok).toBe(true);
    const head = JSON.parse(readFileSync(logPath + '.head', 'utf-8')) as { floor?: RetentionFloor };
    expect(head.floor).toBeDefined();
    expect(head.floor!.seq).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// F14 — audit-export username pseudonym: per-install salted, not reversible.
// ---------------------------------------------------------------------------

const OLD_UNSALTED = (user: string): string =>
  createHash('sha256').update(`panguard-audit-user:${user}`).digest('hex').slice(0, 32);

async function loadAttributionWithHome(home: string) {
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  vi.resetModules();
  const salt = await import('../src/audit/export-salt.js');
  salt.__resetExportSaltCacheForTests();
  return import('../src/audit/attribution.js');
}

describe('F14 anonymizeActorForExport: salted, non-reversible pseudonym', () => {
  const savedHome = process.env.HOME;
  const savedProfile = process.env.USERPROFILE;
  afterEach(() => {
    process.env.HOME = savedHome;
    process.env.USERPROFILE = savedProfile;
    vi.resetModules();
  });

  const actor = { user: 'admin', host: 'corp-box', pid: 4321 };

  it('does not use the old unsalted fixed-domain digest, and never leaks the raw username', async () => {
    const homeA = mkdtempSync(join(tmpdir(), 'pg-homeA-'));
    try {
      const attr = await loadAttributionWithHome(homeA);
      const out = attr.anonymizeActorForExport(actor)!;
      expect(out.user_hash).not.toBe(OLD_UNSALTED('admin'));
      expect(out.user).toBeUndefined();
      expect(JSON.stringify(out)).not.toContain('admin');
      // The salt itself is never part of the export.
      const saltHex = readFileSync(join(homeA, '.panguard', 'export-salt'), 'utf-8').trim();
      expect(JSON.stringify(out)).not.toContain(saltHex);
    } finally {
      rmSync(homeA, { recursive: true, force: true });
    }
  });

  it('is per-install: two installs hash the same username to DIFFERENT pseudonyms', async () => {
    const homeA = mkdtempSync(join(tmpdir(), 'pg-homeA-'));
    const homeB = mkdtempSync(join(tmpdir(), 'pg-homeB-'));
    try {
      const attrA = await loadAttributionWithHome(homeA);
      const hA = attrA.anonymizeActorForExport(actor)!.user_hash;
      const attrB = await loadAttributionWithHome(homeB);
      const hB = attrB.anonymizeActorForExport(actor)!.user_hash;
      expect(hA).not.toBe(hB); // one rainbow table cannot cover all installs
    } finally {
      rmSync(homeA, { recursive: true, force: true });
      rmSync(homeB, { recursive: true, force: true });
    }
  });

  it('is stable within one install (correlatable across the exported set)', async () => {
    const homeA = mkdtempSync(join(tmpdir(), 'pg-homeA-'));
    try {
      const attr1 = await loadAttributionWithHome(homeA);
      const h1 = attr1.anonymizeActorForExport(actor)!.user_hash;
      // Reload (salt persisted in homeA/.panguard/export-salt) -> same pseudonym.
      const attr2 = await loadAttributionWithHome(homeA);
      const h2 = attr2.anonymizeActorForExport(actor)!.user_hash;
      expect(h1).toBe(h2);
    } finally {
      rmSync(homeA, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// F15 — secret scrubbing before durable append.
// ---------------------------------------------------------------------------

const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const PRIVATE_KEY_BLOCK =
  '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA1234567890abcdef\n-----END RSA PRIVATE KEY-----';
const DB_URL = 'postgres://admin:sup3rs3cret@db.internal:5432/prod';
const GH_TOKEN = 'ghp_' + 'a'.repeat(40);

describe('F15 scrubSecretValues: masks secret VALUES, preserves structure', () => {
  it('masks AWS keys, private-key blocks, DB URLs and GitHub tokens in nested strings', () => {
    const input = {
      event: { description: `leaked ${AWS_KEY} and ${GH_TOKEN}`, metadata: { conn: DB_URL } },
      verdict: { evidence: [{ description: PRIVATE_KEY_BLOCK }] },
    };
    const out = scrubSecretValues(input);
    const json = JSON.stringify(out);
    expect(json).not.toContain(AWS_KEY);
    expect(json).not.toContain(GH_TOKEN);
    expect(json).not.toContain('sup3rs3cret');
    expect(json).not.toContain('BEGIN RSA PRIVATE KEY');
    expect(json).toContain(SECRET_MASK);
  });

  it('leaves benign content untouched and does not mutate the input', () => {
    const input = { a: 'hello world', b: [1, 2, 3], c: { d: 'no secrets here' } };
    const frozenCopy = JSON.parse(JSON.stringify(input));
    const out = scrubSecretValues(input);
    expect(out).toEqual(frozenCopy);
    expect(input).toEqual(frozenCopy); // immutability: original unchanged
    expect(out).not.toBe(input);
  });

  it('does NOT corrupt non-plain objects like Date (serializes identically)', () => {
    const now = new Date('2026-07-10T00:00:00.000Z');
    const out = scrubSecretValues({ ts: now, note: 'ok' });
    // A Date must survive as an ISO string through JSON, not collapse to {}.
    expect(JSON.parse(JSON.stringify(out)).ts).toBe('2026-07-10T00:00:00.000Z');
  });
});

describe('F15 ReportAgent: a poisoned event never persists its secret in the log', () => {
  it('the durable events.jsonl contains the mask, not the raw secret', () => {
    const logPath = join(dir, 'events.jsonl');
    const agent = new ReportAgent(logPath, 'protection', undefined, KEY);
    const event = makeEvent({
      description: `git diff exposed ${AWS_KEY}`,
      metadata: { conn: DB_URL, block: PRIVATE_KEY_BLOCK },
    });
    const verdict: ThreatVerdict = {
      conclusion: 'malicious',
      confidence: 90,
      reasoning: 'secret in diff',
      evidence: [{ source: 'rule_match', description: `matched ${AWS_KEY}`, confidence: 90 }],
      recommendedAction: 'notify',
    };
    const response = {
      action: 'notify' as const,
      success: true,
      details: 'logged',
      timestamp: new Date().toISOString(),
    };
    agent.report(event, verdict, response, createEmptyBaseline());

    const onDisk = readFileSync(logPath, 'utf-8');
    expect(onDisk).not.toContain(AWS_KEY);
    expect(onDisk).not.toContain('sup3rs3cret');
    expect(onDisk).not.toContain('BEGIN RSA PRIVATE KEY');
    expect(onDisk).toContain(SECRET_MASK);
    // The record is still a well-formed JSON line (structure preserved).
    const first = JSON.parse(onDisk.trim().split('\n')[0]) as { payload?: { event?: unknown } };
    expect(first.payload).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Shared test helpers.
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  return {
    id: 'evt-test',
    timestamp: new Date('2026-07-10T00:00:00.000Z'),
    source: 'network',
    severity: 'high',
    category: 'brute_force',
    description: 'benign',
    raw: {},
    host: 'test-host',
    metadata: {},
    ...overrides,
  };
}
