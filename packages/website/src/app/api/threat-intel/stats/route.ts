import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * GET /api/threat-intel/stats
 *
 * Returns real-time rule counts by scanning the filesystem.
 * Paths are resolved relative to process.cwd() (monorepo root).
 */

function readJsonSafe<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

interface SyncState {
  lastSyncAt?: string;
}

interface SyncStats {
  totalRecords?: number;
  perSource?: ReadonlyArray<{ source: string; validated: number }>;
}

interface RulesMeta {
  atrRules?: number;
  atrByStatus?: Record<string, number>;
}

export async function GET() {
  try {
    const root = process.cwd();

    const syncState = readJsonSafe<SyncState>(
      resolve(root, 'packages/threat-cloud/data/threat-intel/sync-state.json')
    );
    const syncStats = readJsonSafe<SyncStats>(
      resolve(root, 'packages/threat-cloud/data/threat-intel/sync-stats.json')
    );

    const sources = syncStats?.perSource
      ? syncStats.perSource.filter((s) => s.validated > 0).length
      : 0;
    const validatedRecords = syncStats?.totalRecords ?? 0;

    const meta = readJsonSafe<RulesMeta>(
      resolve(root, 'config/rules/auto-generated/.rules-meta.json')
    );

    const draftATR = meta?.atrByStatus?.['draft'] ?? 0;
    const promotedATR = meta?.atrByStatus?.['promoted'] ?? 0;

    return NextResponse.json({
      atr: {
        rules: meta?.atrRules ?? 0,
        promoted: promotedATR,
        draft: draftATR,
      },
      lastSync: syncState?.lastSyncAt ?? null,
      sources,
      validatedRecords,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to compute rule stats' }, { status: 500 });
  }
}
