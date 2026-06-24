/**
 * AuditChain — durable, append-only, tamper-evident JSONL log.
 *
 * Wraps a JSONL file so every appended line is a {@link ChainedRecord}: linked
 * to its predecessor by a SHA-256 hash and signed with a local HMAC key. The
 * chain head (last seq + last hash) is persisted to a rotation-independent
 * head-anchor so:
 *   - a fresh process can append without rescanning the whole file, and
 *   - tail truncation is detectable (head-anchor seq > last record seq).
 *
 * The chain SPANS rotation: when the active log is rotated out, the next file's
 * first record links to the rotated-out file's last hash (carried in the
 * head-anchor), so the chain is continuous across events.jsonl + events.jsonl.1.
 *
 * SCOPE — tamper EVIDENCE. The HMAC key is same-user-readable (see audit-key.ts
 * and SECURITY.md). This detects tampering; it does not prevent it. The no-op
 * anchor seam (getHead + optional anchor hook) is where remote anchoring — the
 * enterprise upgrade that closes the same-user gap — plugs in.
 *
 * @module @panguard-ai/panguard-guard/audit/audit-chain
 */

import {
  appendFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { createLogger } from '@panguard-ai/core';
import {
  GENESIS_HASH,
  computeHash,
  signHmac,
  verifyChain,
  type ChainedRecord,
  type VerifyResult,
} from './hash-chain.js';

const logger = createLogger('panguard-guard:audit-chain');

/** Persisted chain head — the anchor for appends and truncation detection. */
export interface ChainHead {
  /** seq of the last appended record (-1 if the chain is empty). */
  readonly seq: number;
  /** hash of the last appended record (GENESIS_HASH if empty). */
  readonly hash: string;
  /** ISO timestamp the head was last updated. */
  readonly updatedAt: string;
}

/** Hook invoked after the head advances. Default is a no-op (local-only). */
export type AnchorHook = (head: ChainHead) => void;

/** Options for the audit chain. */
export interface AuditChainOptions {
  /** HMAC signing key. When omitted, records are hashed but not HMAC-signed. */
  readonly key?: Buffer;
  /**
   * Directory holding the rotation-independent head-anchor. Defaults to the log
   * file's directory. The anchor file itself is `<dataDir>/chainHead.json` when
   * dataDir is given, else `<logPath>.head`.
   */
  readonly dataDir?: string;
  /**
   * Remote-anchor seam. Called (best-effort) after each head advance with the
   * new head. Default no-op keeps the chain local-only. An enterprise build can
   * publish the head to Threat Cloud here to close the same-user-key gap.
   */
  readonly anchor?: AnchorHook;
}

const EMPTY_HEAD: ChainHead = { seq: -1, hash: GENESIS_HASH, updatedAt: '' };

/** Append-only tamper-evident JSONL chain over a single logical log file. */
export class AuditChain {
  private readonly logPath: string;
  private readonly headPath: string;
  private readonly key: Buffer | undefined;
  private readonly anchor: AnchorHook;
  private head: ChainHead;

  constructor(logPath: string, opts: AuditChainOptions = {}) {
    this.logPath = logPath;
    this.key = opts.key;
    this.anchor = opts.anchor ?? (() => {});
    this.headPath = opts.dataDir
      ? join(opts.dataDir, 'chainHead.json')
      : `${logPath}.head`;

    try {
      mkdirSync(dirname(logPath), { recursive: true, mode: 0o700 });
    } catch {
      // Directory may already exist.
    }

    this.head = this.loadOrHealHead();
  }

  /**
   * Append a payload as a new chained record and persist it. Returns the record.
   *
   * Fail-open on WRITE error: a broken audit file must never brick the guarded
   * path. Append errors log loudly to stderr; the record is still returned so
   * the caller proceeds.
   */
  append<T>(payload: T): ChainedRecord<T> {
    const seq = this.head.seq + 1;
    const ts = new Date().toISOString();
    const prevHash = this.head.hash;
    const hash = computeHash(prevHash, seq, ts, payload);
    const record: ChainedRecord<T> = {
      seq,
      ts,
      payload,
      prevHash,
      hash,
      ...(this.key ? { hmac: signHmac(hash, this.key) } : {}),
    };

    try {
      appendFileSync(this.logPath, JSON.stringify(record) + '\n', 'utf-8');
      const nextHead: ChainHead = { seq, hash, updatedAt: ts };
      this.writeHead(nextHead);
      this.head = nextHead;
      this.safeAnchor(nextHead);
    } catch (err) {
      // FAIL-OPEN on write: loud stderr, but the caller proceeds.
      process.stderr.write(
        `[panguard-audit] append failed (continuing fail-open): ${errMsg(err)}\n`
      );
    }

    return record;
  }

  /**
   * Read every record across the active file + rotated files, oldest first,
   * using a streaming reader (line-by-line, memory-bounded). Chained lines parse
   * to ChainedRecord; legacy un-chained lines are preserved verbatim as their
   * parsed object so verify() can classify them as the 'unchained-legacy' prefix.
   * The element type is `unknown` because the suffix may mix both (callers cast
   * + filter; verify() accepts unknown[]).
   */
  async readAll(): Promise<ChainedRecord[]> {
    const out: ChainedRecord[] = [];
    for (const filePath of this.orderedLogFiles()) {
      const recs = await this.streamFile(filePath);
      out.push(...recs);
    }
    return out;
  }

  /**
   * Verify the durable chain end-to-end. Detects edits, deletions, insertions,
   * reorders (all 'hash-break'/'seq-gap'), bad HMAC, and tail truncation
   * (head-anchor seq strictly greater than the last on-disk record seq).
   */
  async verify(): Promise<VerifyResult> {
    const records = await this.readAll();
    const base = verifyChain(records, this.key);

    // A content-level failure (hash-break / seq-gap / bad-hmac) is MORE specific
    // than truncation and points at the exact bad index, so it wins. Truncation
    // is reported only when the surviving content otherwise verifies — i.e. the
    // chain is intact but shorter than the head-anchor remembers (tail removed).
    const contentOk = base.ok || base.reason === 'unchained-legacy';
    if (!contentOk) return base;

    // Truncation: the head-anchor remembers a seq the file no longer contains.
    // Use the highest CHAINED seq on disk (legacy lines have no seq).
    let lastSeq = -1;
    for (const rec of records) {
      if (isChainedRecord(rec) && rec.seq > lastSeq) lastSeq = rec.seq;
    }
    if (this.head.seq > lastSeq) {
      return {
        ok: false,
        verifiedCount: base.verifiedCount,
        firstBadIndex: records.length,
        reason: 'truncated',
      };
    }

    return base;
  }

  /** Current persisted chain head. The no-op anchor seam reads this. */
  getHead(): ChainHead {
    return this.head;
  }

  // ---------------------------------------------------------------------------
  // Rotation support — kept rotation-independent via the head-anchor.
  // ---------------------------------------------------------------------------

  /**
   * Carry the chain across a log rotation. The caller (ReportAgent) renames the
   * active file out of the way; the head-anchor already holds the rotated-out
   * file's last hash, so the NEXT append's prevHash chains to it automatically.
   * This is a no-op marker for clarity + future hooks — the head is the source
   * of truth, so rotation needs no special chain handling here.
   */
  noteRotation(): void {
    logger.info(
      `Audit chain spans rotation at seq ${this.head.seq} (head hash carried forward)`
    );
  }

  // ---------------------------------------------------------------------------
  // Head-anchor persistence (tmp + rename, 0600).
  // ---------------------------------------------------------------------------

  private writeHead(head: ChainHead): void {
    const tmp = `${this.headPath}.tmp`;
    writeFileSync(tmp, JSON.stringify(head), { mode: 0o600 });
    renameSync(tmp, this.headPath);
  }

  /**
   * Load the head-anchor. If it is missing or stale (file exists but anchor
   * absent), self-heal by streaming the file to recompute the true head and
   * warn loudly.
   */
  private loadOrHealHead(): ChainHead {
    const onDisk = this.tryReadHead();
    const fileExists = existsSync(this.logPath) || this.rotatedFiles().length > 0;

    if (onDisk && !fileExists) {
      // Anchor present but no log — treat anchor as authoritative (empty chain
      // is the only safe assumption if files vanished; keep anchor for truncation
      // detection on next verify()).
      return onDisk;
    }

    if (!onDisk && !fileExists) {
      return EMPTY_HEAD;
    }

    if (!onDisk && fileExists) {
      // Self-heal: recompute head from the file.
      logger.warn(
        `Audit head-anchor missing but log exists at ${this.logPath} — self-healing by stream`
      );
      const healed = this.recomputeHeadSync();
      try {
        this.writeHead(healed);
      } catch (err) {
        logger.warn(`Failed to persist healed head: ${errMsg(err)}`);
      }
      return healed;
    }

    // Both present — anchor is authoritative for appends. Truncation/edit is
    // surfaced by verify(), not by silently trusting or rewriting here.
    return onDisk!;
  }

  private tryReadHead(): ChainHead | null {
    try {
      if (!existsSync(this.headPath)) return null;
      const raw = readFileSync(this.headPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ChainHead>;
      if (typeof parsed.seq === 'number' && typeof parsed.hash === 'string') {
        return {
          seq: parsed.seq,
          hash: parsed.hash,
          updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
        };
      }
    } catch (err) {
      logger.warn(`Audit head-anchor unreadable: ${errMsg(err)}`);
    }
    return null;
  }

  /** Synchronous head recompute from the last on-disk record (self-heal path). */
  private recomputeHeadSync(): ChainHead {
    let lastChained: ChainedRecord | null = null;
    for (const filePath of this.orderedLogFiles()) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().length > 0);
        for (const line of lines) {
          const parsed = safeParse(line);
          if (parsed && isChainedRecord(parsed)) {
            lastChained = parsed;
          }
        }
      } catch {
        // skip unreadable file
      }
    }
    if (!lastChained) return EMPTY_HEAD;
    return {
      seq: lastChained.seq,
      hash: lastChained.hash,
      updatedAt: lastChained.ts,
    };
  }

  private safeAnchor(head: ChainHead): void {
    try {
      this.anchor(head);
    } catch (err) {
      // Anchoring is best-effort: never let it break the append path.
      process.stderr.write(`[panguard-audit] anchor hook failed: ${errMsg(err)}\n`);
    }
  }

  // ---------------------------------------------------------------------------
  // File discovery + streaming (mirrors report-agent's stream pattern).
  // ---------------------------------------------------------------------------

  /** Active file first, then rotated files in OLDEST-first order? No: we want
   * oldest-first overall so the chain reads in append order. Rotation produces
   * events.jsonl (newest) + events.jsonl.1 (older) + ... so oldest is highest N. */
  private orderedLogFiles(): string[] {
    const rotated = this.rotatedFiles(); // ascending by N: .1, .2, ...
    // Oldest first = highest N first, then the active file last.
    const oldestFirst = [...rotated].reverse().map((r) => r.file);
    return [...oldestFirst, this.logPath];
  }

  private rotatedFiles(): Array<{ file: string; num: number }> {
    const dir = dirname(this.logPath);
    const base = basename(this.logPath);
    try {
      return readdirSync(dir)
        .filter((f) => f.startsWith(base + '.'))
        .map((f) => ({ file: join(dir, f), num: parseInt(f.slice(base.length + 1), 10) }))
        .filter((x) => !isNaN(x.num))
        .sort((a, b) => a.num - b.num);
    } catch {
      return [];
    }
  }

  private streamFile(filePath: string): Promise<ChainedRecord[]> {
    return new Promise((resolve) => {
      const records: ChainedRecord[] = [];
      try {
        if (!existsSync(filePath)) {
          resolve(records);
          return;
        }
        const stream = createReadStream(filePath, { encoding: 'utf-8' });
        const rl = createInterface({ input: stream, crlfDelay: Infinity });
        rl.on('line', (line) => {
          if (!line.trim()) return;
          const parsed = safeParse(line);
          // Push chained AND legacy lines verbatim; verify() classifies them.
          if (parsed) records.push(parsed as unknown as ChainedRecord);
        });
        rl.on('close', () => resolve(records));
        rl.on('error', () => resolve(records));
      } catch {
        resolve(records);
      }
    });
  }
}

function safeParse(line: string): Record<string, unknown> | null {
  try {
    return JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isChainedRecord(rec: unknown): rec is ChainedRecord {
  if (rec === null || typeof rec !== 'object') return false;
  const r = rec as Record<string, unknown>;
  return (
    typeof r['hash'] === 'string' &&
    typeof r['prevHash'] === 'string' &&
    typeof r['seq'] === 'number'
  );
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
