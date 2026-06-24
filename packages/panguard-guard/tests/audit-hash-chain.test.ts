/**
 * Adversarial tests for the tamper-evident audit hash chain.
 *
 * These prove the chain DETECTS tampering — not just that the happy path works.
 * A hardening that "looks done" but does not detect tampering is worse than
 * nothing, so every mutation an attacker could make has an explicit test.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  canonicalize,
  computeHash,
  verifyChain,
  GENESIS_HASH,
  AuditChain,
  type ChainedRecord,
} from '../src/audit/index.js';

const KEY = randomBytes(32);

function readLines(path: string): Record<string, unknown>[] {
  return readFileSync(path, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

function writeLines(path: string, recs: unknown[]): void {
  writeFileSync(path, recs.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf-8');
}

describe('hash-chain primitives', () => {
  it('canonicalize sorts object keys recursively (order-independent)', () => {
    const a = { b: 1, a: { z: 2, y: 3 }, c: [{ q: 1, p: 2 }] };
    const b = { c: [{ p: 2, q: 1 }], a: { y: 3, z: 2 }, b: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it('canonicalize preserves array ORDER (order is semantic for arrays)', () => {
    expect(canonicalize([1, 2, 3])).not.toBe(canonicalize([3, 2, 1]));
  });

  it('canonicalize order-independence is stable across many shapes (property)', () => {
    for (let i = 0; i < 50; i++) {
      const keys = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
      const obj: Record<string, unknown> = {};
      const shuffled = [...keys].sort(() => Math.random() - 0.5);
      for (const k of shuffled) obj[k] = { n: k.length, nested: { x: k } };
      const sorted: Record<string, unknown> = {};
      for (const k of [...keys].sort()) sorted[k] = { nested: { x: k }, n: k.length };
      expect(canonicalize(obj)).toBe(canonicalize(sorted));
    }
  });

  it('computeHash genesis prevHash is 64 zeros', () => {
    expect(GENESIS_HASH).toBe('0'.repeat(64));
    const h = computeHash(GENESIS_HASH, 0, '2026-01-01T00:00:00.000Z', { a: 1 });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifyChain reports empty on an empty list', () => {
    const r = verifyChain([]);
    expect(r.reason).toBe('empty');
    expect(r.ok).toBe(false);
  });
});

describe('AuditChain happy path', () => {
  let dir: string;
  let logPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'audit-chain-'));
    logPath = join(dir, 'events.jsonl');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('appends a verifiable chain and verify() returns ok', async () => {
    const chain = new AuditChain(logPath, { key: KEY });
    chain.append({ msg: 'one' });
    chain.append({ msg: 'two' });
    chain.append({ msg: 'three' });

    const result = await chain.verify();
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('ok');
    expect(result.verifiedCount).toBe(3);
    expect(result.firstBadIndex).toBe(-1);
  });

  it('records carry seq from 0, hmac, and link prevHash -> hash', async () => {
    const chain = new AuditChain(logPath, { key: KEY });
    chain.append({ n: 1 });
    chain.append({ n: 2 });
    const lines = readLines(logPath) as unknown as ChainedRecord[];
    expect(lines[0]!.seq).toBe(0);
    expect(lines[0]!.prevHash).toBe(GENESIS_HASH);
    expect(typeof lines[0]!.hmac).toBe('string');
    expect(lines[1]!.prevHash).toBe(lines[0]!.hash);
  });

  it('head-anchor file is persisted at <logPath>.head with 0600', () => {
    const chain = new AuditChain(logPath, { key: KEY });
    chain.append({ n: 1 });
    const headPath = `${logPath}.head`;
    expect(existsSync(headPath)).toBe(true);
    const mode = statSync(headPath).mode & 0o777;
    expect(mode).toBe(0o600);
    expect(chain.getHead().seq).toBe(0);
  });

  it('a second chain instance resumes from the head-anchor (no rescan)', async () => {
    const c1 = new AuditChain(logPath, { key: KEY });
    c1.append({ n: 1 });
    c1.append({ n: 2 });

    const c2 = new AuditChain(logPath, { key: KEY });
    expect(c2.getHead().seq).toBe(1);
    c2.append({ n: 3 });

    const result = await c2.verify();
    expect(result.ok).toBe(true);
    expect(result.verifiedCount).toBe(3);
  });
});

describe('AuditChain adversarial — tampering is DETECTED', () => {
  let dir: string;
  let logPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'audit-adv-'));
    logPath = join(dir, 'events.jsonl');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  async function seed(n = 4): Promise<AuditChain> {
    const chain = new AuditChain(logPath, { key: KEY });
    for (let i = 0; i < n; i++) chain.append({ idx: i, msg: `event-${i}` });
    return chain;
  }

  it('modify a middle byte (payload edit) => hash-break at that index', async () => {
    const chain = await seed();
    const recs = readLines(logPath) as unknown as ChainedRecord[];
    // Tamper the payload of record index 2 without fixing its hash.
    (recs[2]!.payload as Record<string, unknown>).msg = 'TAMPERED';
    writeLines(logPath, recs);

    const result = await chain.verify();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('hash-break');
    expect(result.firstBadIndex).toBe(2);
  });

  it('delete a line => seq-gap', async () => {
    const chain = await seed();
    const recs = readLines(logPath);
    recs.splice(2, 1); // remove the seq=2 record
    writeLines(logPath, recs);

    const result = await chain.verify();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('seq-gap');
    expect(result.firstBadIndex).toBe(2);
  });

  it('insert a fabricated line => hash-break', async () => {
    const chain = await seed();
    const recs = readLines(logPath) as unknown as ChainedRecord[];
    const forged: ChainedRecord = {
      seq: 2,
      ts: new Date().toISOString(),
      payload: { idx: 99, msg: 'forged' },
      prevHash: recs[1]!.hash,
      hash: 'deadbeef'.repeat(8),
    };
    recs.splice(2, 0, forged);
    // Re-number trailing seqs so it is not a trivial seq-gap — this is the
    // strongest insertion attack: keep seqs consecutive.
    for (let i = 3; i < recs.length; i++) recs[i]!.seq = i;
    writeLines(logPath, recs);

    const result = await chain.verify();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('hash-break');
    expect(result.firstBadIndex).toBe(2);
  });

  it('reorder two records => detected (hash-break)', async () => {
    const chain = await seed();
    const recs = readLines(logPath);
    const tmp = recs[1];
    recs[1] = recs[2]!;
    recs[2] = tmp!;
    writeLines(logPath, recs);

    const result = await chain.verify();
    expect(result.ok).toBe(false);
    // Swapping seq order surfaces as a seq-gap or hash-break at the swap point.
    expect(['seq-gap', 'hash-break']).toContain(result.reason);
    expect(result.firstBadIndex).toBe(1);
  });

  it('truncate the tail with a higher head-anchor => truncated', async () => {
    const chain = await seed(4);
    // head-anchor now remembers seq 3. Truncate the last two records on disk.
    const recs = readLines(logPath);
    writeLines(logPath, recs.slice(0, 2)); // keep seq 0,1
    // Reopen so verify() reads the persisted head-anchor (seq 3 > lastSeq 1).
    const reopened = new AuditChain(logPath, { key: KEY });
    const result = await reopened.verify();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('truncated');
  });

  it('forge a CONSISTENT chain with the WRONG key => bad-hmac', async () => {
    // Attacker who cannot read the key rebuilds a perfectly consistent chain
    // (valid hashes + seqs) but signs with their own key. HMAC check catches it.
    await seed();
    const wrongKey = randomBytes(32);
    const forgedChain = new AuditChain(join(dir, 'forged.jsonl'), { key: wrongKey });
    forgedChain.append({ idx: 0, msg: 'event-0' });
    forgedChain.append({ idx: 1, msg: 'event-1' });
    // Overwrite the real log with the attacker's consistent-but-wrong-key chain.
    const forgedRecs = readLines(join(dir, 'forged.jsonl'));
    writeLines(logPath, forgedRecs);

    // Verify the real log under the REAL key.
    const verifier = new AuditChain(logPath, { key: KEY });
    const result = await verifier.verify();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('bad-hmac');
  });

  it('chained suffix verifies even when hashes are internally consistent (no key)', async () => {
    // Without a key, a forged-but-consistent chain passes hash checks — this is
    // the documented limit; the HMAC is what binds the chain to a secret.
    const forgedChain = new AuditChain(join(dir, 'nokey.jsonl'));
    forgedChain.append({ a: 1 });
    forgedChain.append({ a: 2 });
    const noKeyVerifier = new AuditChain(join(dir, 'nokey.jsonl'));
    const result = await noKeyVerifier.verify();
    expect(result.ok).toBe(true);
  });
});

describe('AuditChain rotation continuity', () => {
  let dir: string;
  let logPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'audit-rot-'));
    logPath = join(dir, 'events.jsonl');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('chain spans events.jsonl + events.jsonl.1 (continuous across rotation)', async () => {
    const chain = new AuditChain(logPath, { key: KEY });
    chain.append({ n: 0 });
    chain.append({ n: 1 });

    // Simulate rotation: move the active file to .1 (head-anchor stays put).
    const rotated = `${logPath}.1`;
    writeFileSync(rotated, readFileSync(logPath, 'utf-8'));
    rmSync(logPath);
    chain.noteRotation();

    // Append after rotation — must link to the rotated-out file's last hash.
    chain.append({ n: 2 });
    chain.append({ n: 3 });

    const result = await chain.verify();
    expect(result.ok).toBe(true);
    expect(result.verifiedCount).toBe(4);

    // The first post-rotation record's prevHash equals the last pre-rotation hash.
    const rotatedRecs = readLines(rotated) as unknown as ChainedRecord[];
    const activeRecs = readLines(logPath) as unknown as ChainedRecord[];
    expect(activeRecs[0]!.prevHash).toBe(rotatedRecs[rotatedRecs.length - 1]!.hash);
    expect(activeRecs[0]!.seq).toBe(2);
  });
});

describe('AuditChain legacy tolerance + self-heal', () => {
  let dir: string;
  let logPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'audit-legacy-'));
    logPath = join(dir, 'events.jsonl');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('pre-existing un-chained legacy lines => unchained-legacy (not tampered)', async () => {
    // Legacy prefix (no hash field) then a chained suffix appended on upgrade.
    writeFileSync(
      logPath,
      JSON.stringify({ legacy: true, msg: 'old-1' }) +
        '\n' +
        JSON.stringify({ legacy: true, msg: 'old-2' }) +
        '\n',
      'utf-8'
    );
    // Open AFTER legacy lines exist: head self-heals to empty (no chained recs),
    // and the first append genesis-links (legacy prefix is unverifiable).
    const chain = new AuditChain(logPath, { key: KEY });
    chain.append({ chained: true, msg: 'new-1' });

    const result = await chain.verify();
    expect(result.reason).toBe('unchained-legacy');
    // The chained suffix is counted; the legacy prefix is not flagged as tamper.
    expect(result.verifiedCount).toBe(1);
  });

  it('self-heals a missing head-anchor by streaming the existing chain', async () => {
    const c1 = new AuditChain(logPath, { key: KEY });
    c1.append({ n: 1 });
    c1.append({ n: 2 });
    // Delete the head-anchor to simulate a lost/stale anchor.
    rmSync(`${logPath}.head`);

    const c2 = new AuditChain(logPath, { key: KEY });
    // Healed head should reflect the last on-disk record (seq 1).
    expect(c2.getHead().seq).toBe(1);
    c2.append({ n: 3 });
    const result = await c2.verify();
    expect(result.ok).toBe(true);
    expect(result.verifiedCount).toBe(3);
  });
});

describe('AuditChain fail-open on write error', () => {
  it('append returns a record and does not throw when the log path is unwritable', () => {
    // Point the log at a path whose parent is a FILE, so writes fail.
    const dir = mkdtempSync(join(tmpdir(), 'audit-failopen-'));
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, 'x');
    const badLog = join(blocker, 'nested', 'events.jsonl');
    const chain = new AuditChain(badLog, { key: KEY });
    // Must not throw — fail-open: the guarded path proceeds.
    const rec = chain.append({ n: 1 });
    expect(rec.seq).toBe(0);
    expect(rec.hash).toMatch(/^[0-9a-f]{64}$/);
    rmSync(dir, { recursive: true, force: true });
  });
});
