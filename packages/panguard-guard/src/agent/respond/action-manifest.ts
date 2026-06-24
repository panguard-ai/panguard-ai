/**
 * Action manifest for persistence and rollback tracking.
 * @module @panguard-ai/panguard-guard/agent/respond/action-manifest
 */

import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createLogger } from '@panguard-ai/core';
import type { ResponseAction, ThreatVerdict } from '../../types.js';
import type { ActionManifestEntry } from './types.js';
import { AuditChain, type ChainedRecord, type VerifyResult } from '../../audit/index.js';

const logger = createLogger('panguard-guard:action-manifest');

export class ActionManifest {
  private readonly entries: ActionManifestEntry[] = [];
  private readonly manifestPath: string;
  /** Tamper-evident chain over action-manifest.jsonl. */
  private readonly chain: AuditChain;

  constructor(dataDir: string, auditKey?: Buffer) {
    this.manifestPath = `${dataDir}/action-manifest.jsonl`;

    // Ensure manifest directory exists
    try {
      mkdirSync(dirname(this.manifestPath), { recursive: true });
    } catch {
      // Directory may already exist
    }

    // Head-anchor defaults to `<manifestPath>.head` (per-file, rotation-independent)
    // so it never collides with the events / proxy chain anchors in the same dataDir.
    this.chain = new AuditChain(this.manifestPath, { key: auditKey });

    this.load();
  }

  /** Record a new action and persist it */
  record(
    action: ResponseAction,
    target: string,
    verdict: ThreatVerdict,
    expiresAt?: string
  ): ActionManifestEntry {
    const entry: ActionManifestEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      target,
      timestamp: new Date().toISOString(),
      expiresAt,
      rolledBack: false,
      verdict: { conclusion: verdict.conclusion, confidence: verdict.confidence },
    };

    this.entries.push(entry);
    this.persist(entry);
    return entry;
  }

  /** Find an entry by ID that has not been rolled back */
  findRollbackable(entryId: string): ActionManifestEntry | undefined {
    return this.entries.find((e) => e.id === entryId && !e.rolledBack);
  }

  /** Find an entry by ID */
  findById(entryId: string): ActionManifestEntry | undefined {
    return this.entries.find((e) => e.id === entryId);
  }

  /** Get all active (non-rolled-back) entries */
  getActive(): ActionManifestEntry[] {
    return this.entries.filter((e) => !e.rolledBack);
  }

  /** Mark an entry as rolled back and persist the change */
  markRolledBack(entryId: string): void {
    const entry = this.entries.find((e) => e.id === entryId);
    if (entry) {
      entry.rolledBack = true;
      this.persist(entry);
    }
  }

  /**
   * Persist a single entry through the tamper-evident chain. The original
   * ActionManifestEntry shape is preserved verbatim inside record.payload so the
   * load() reader (and any external reader after the .payload unwrap shim) keeps
   * working. AuditChain.append is fail-open (logs to stderr, never throws).
   */
  persist(entry: ActionManifestEntry): void {
    this.chain.append<ActionManifestEntry>(entry);
  }

  /** Verify the durable action-manifest chain end-to-end. */
  async verify(): Promise<VerifyResult> {
    return this.chain.verify();
  }

  /** Load existing manifest entries from disk, unwrapping the chain envelope. */
  private load(): void {
    try {
      const content = readFileSync(this.manifestPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = unwrapManifestEntry(line);
          if (entry) this.entries.push(entry);
        } catch {
          // Skip malformed lines
        }
      }
      logger.info(`Loaded ${this.entries.length} action manifest entries`);
    } catch {
      // Manifest file may not exist yet
    }
  }
}

/**
 * Parse a JSONL line into an ActionManifestEntry, unwrapping the tamper-evident
 * chain envelope. New lines are ChainedRecord<ActionManifestEntry>; pre-chain
 * legacy lines are a bare entry. Both are supported for mid-upgrade logs.
 */
function unwrapManifestEntry(line: string): ActionManifestEntry | null {
  const parsed = JSON.parse(line) as Record<string, unknown>;
  if (
    typeof parsed['hash'] === 'string' &&
    typeof parsed['prevHash'] === 'string' &&
    parsed['payload'] !== undefined
  ) {
    return (parsed as unknown as ChainedRecord<ActionManifestEntry>).payload;
  }
  if (typeof parsed['id'] === 'string') {
    return parsed as unknown as ActionManifestEntry;
  }
  return null;
}
