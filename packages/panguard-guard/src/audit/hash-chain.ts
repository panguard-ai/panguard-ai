/**
 * Tamper-evident hash chain primitives (pure, node:crypto only).
 *
 * Every durable audit record is linked to its predecessor by a SHA-256 hash,
 * forming an append-only chain. Any edit, deletion, reorder, or insertion
 * breaks the chain at the point of tampering and is detectable by verifyChain().
 *
 * SCOPE — tamper EVIDENCE, not tamper PREVENTION. The optional HMAC binds the
 * chain to a local key; an attacker who can READ that key can recompute a
 * consistent chain. This module makes tampering DETECTABLE, never IMPOSSIBLE.
 * Closing the same-user-key gap requires remote anchoring (see audit-chain.ts).
 *
 * @module @panguard-ai/panguard-guard/audit/hash-chain
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** SHA-256 hex digest length. */
export const HASH_HEX_LENGTH = 64;

/** Genesis predecessor hash: 64 zeros. The first record in a chain links here. */
export const GENESIS_HASH = '0'.repeat(HASH_HEX_LENGTH);

/**
 * A single chained record. The payload is the original log line (verbatim);
 * seq/ts/prevHash/hash/hmac are the chain envelope. hash and hmac are EXCLUDED
 * from the hashed material (a record cannot hash over its own hash).
 */
export interface ChainedRecord<T = unknown> {
  /** Monotonic sequence, strictly incrementing from 0. */
  readonly seq: number;
  /** ISO timestamp when the record was chained. */
  readonly ts: string;
  /** The original, unmodified log payload. */
  readonly payload: T;
  /** Hash of the predecessor record (GENESIS_HASH for seq 0 or post-rotation genesis). */
  readonly prevHash: string;
  /** This record's hash (over prevHash, seq, ts, canonical payload). */
  readonly hash: string;
  /** Optional HMAC of `hash` under the local audit key. */
  readonly hmac?: string;
}

/** Why a chain failed verification (or 'ok'). */
export type VerifyReason =
  | 'ok'
  | 'hash-break'
  | 'seq-gap'
  | 'bad-hmac'
  | 'truncated'
  | 'empty'
  | 'unchained-legacy';

/** Result of verifyChain over an ordered list of records. */
export interface VerifyResult {
  /** True only when every chained record verified end-to-end. */
  readonly ok: boolean;
  /** Number of chained records that verified successfully. */
  readonly verifiedCount: number;
  /** Index (into the input array) of the first bad record, or -1 if none. */
  readonly firstBadIndex: number;
  /** Machine-readable reason. */
  readonly reason: VerifyReason;
}

/**
 * Deterministic JSON serialization with RECURSIVELY sorted object keys.
 *
 * Two semantically equal objects (same data, different key order, nested at any
 * depth) serialize to the same string, so the hash is stable regardless of how
 * the producer happened to order its keys. Arrays keep their order (order is
 * semantically meaningful for arrays).
 *
 * CRITICAL: we first normalize through JSON (parse(stringify(value))) so values
 * with a custom toJSON (Date, Buffer, etc.) and `undefined` fields are reduced to
 * their PLAIN JSON form — exactly what a reader sees after JSON.parse. Without
 * this, a Date in the payload would hash as `{}` at write time but as its ISO
 * string at read time, silently breaking the chain. Normalizing guarantees
 * write/read parity (the read side is already JSON-parsed).
 */
export function canonicalize(value: unknown): string {
  // toJSONString handles undefined at the top level (JSON.stringify(undefined)
  // is the string "undefined"'s absence — guard it).
  const json = JSON.stringify(value);
  if (json === undefined) return JSON.stringify(null);
  const normalized: unknown = JSON.parse(json);
  return JSON.stringify(sortDeep(normalized));
}

/**
 * Recursively rebuild a (already JSON-normalized) value with object keys sorted.
 * Primitives pass through. Arrays recurse element-wise (order preserved). Objects
 * are rebuilt key-sorted.
 */
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortDeep(item));
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortDeep(obj[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Compute the chain hash for a record.
 * hash = sha256( prevHash + '\n' + seq + '\n' + ts + '\n' + canonicalize(payload) )
 *
 * The newline delimiters make the field boundaries unambiguous so distinct
 * field combinations cannot collide via concatenation.
 */
export function computeHash(prevHash: string, seq: number, ts: string, payload: unknown): string {
  return createHash('sha256')
    .update(`${prevHash}\n${seq}\n${ts}\n${canonicalize(payload)}`)
    .digest('hex');
}

/**
 * Sign a record hash with the local audit key.
 * hmac = HMAC-SHA256(key, hash) hex.
 */
export function signHmac(hash: string, key: Buffer): string {
  return createHmac('sha256', key).update(hash).digest('hex');
}

/** Constant-time hex-string compare. Length mismatch returns false (never throws). */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/** True if a record carries the chain envelope (a chained record, not a legacy line). */
function isChained(rec: unknown): rec is ChainedRecord {
  if (rec === null || typeof rec !== 'object') return false;
  const r = rec as Record<string, unknown>;
  return (
    typeof r['hash'] === 'string' &&
    typeof r['prevHash'] === 'string' &&
    typeof r['seq'] === 'number'
  );
}

/**
 * Verify an ordered list of records.
 *
 * Pre-existing un-chained legacy lines (no hash field) at the FRONT are treated
 * as an un-verifiable prefix: verification starts at the first chained record
 * and reports reason 'unchained-legacy' (verifiedCount counts the chained suffix
 * only). This stops an upgrade from flagging the whole file as tampered.
 *
 * Walk rules over the chained suffix:
 *  - seq must strictly increment from the first chained record's seq baseline
 *    (else 'seq-gap'),
 *  - recompute hash and compare (else 'hash-break'),
 *  - prevHash of each record must equal the previous record's hash (else 'hash-break'),
 *  - if a key is supplied, recompute the HMAC and timing-safe compare (else 'bad-hmac').
 */
export function verifyChain(records: readonly unknown[], key?: Buffer): VerifyResult {
  if (records.length === 0) {
    return { ok: false, verifiedCount: 0, firstBadIndex: -1, reason: 'empty' };
  }

  // Find where the chained suffix begins. A legacy prefix is tolerated.
  const firstChainedIndex = records.findIndex((r) => isChained(r));
  if (firstChainedIndex === -1) {
    // Entire file is legacy / un-chained — nothing verifiable, but not "tampered".
    return {
      ok: false,
      verifiedCount: 0,
      firstBadIndex: -1,
      reason: 'unchained-legacy',
    };
  }

  const hasLegacyPrefix = firstChainedIndex > 0;
  let verifiedCount = 0;
  let expectedPrevHash = GENESIS_HASH;
  let expectedSeq = (records[firstChainedIndex] as ChainedRecord).seq;
  // The first chained record's seq is the baseline; subsequent records must
  // increment by exactly 1. (A post-rotation genesis can start at any seq, but
  // within a single readAll() the suffix is contiguous.)

  for (let i = firstChainedIndex; i < records.length; i++) {
    const rec = records[i];
    if (!isChained(rec)) {
      // A legacy line appearing AFTER chained records means the suffix was
      // disturbed (e.g. a chained line replaced with a raw one) — hash-break.
      return { ok: false, verifiedCount, firstBadIndex: i, reason: 'hash-break' };
    }

    if (rec.seq !== expectedSeq) {
      return { ok: false, verifiedCount, firstBadIndex: i, reason: 'seq-gap' };
    }

    if (rec.prevHash !== expectedPrevHash) {
      return { ok: false, verifiedCount, firstBadIndex: i, reason: 'hash-break' };
    }

    const recomputed = computeHash(rec.prevHash, rec.seq, rec.ts, rec.payload);
    if (!timingSafeEqualHex(recomputed, rec.hash)) {
      return { ok: false, verifiedCount, firstBadIndex: i, reason: 'hash-break' };
    }

    if (key) {
      if (typeof rec.hmac !== 'string') {
        return { ok: false, verifiedCount, firstBadIndex: i, reason: 'bad-hmac' };
      }
      const recomputedHmac = signHmac(rec.hash, key);
      if (!timingSafeEqualHex(recomputedHmac, rec.hmac)) {
        return { ok: false, verifiedCount, firstBadIndex: i, reason: 'bad-hmac' };
      }
    }

    verifiedCount++;
    expectedPrevHash = rec.hash;
    expectedSeq = rec.seq + 1;
  }

  return {
    ok: !hasLegacyPrefix,
    verifiedCount,
    firstBadIndex: -1,
    reason: hasLegacyPrefix ? 'unchained-legacy' : 'ok',
  };
}
