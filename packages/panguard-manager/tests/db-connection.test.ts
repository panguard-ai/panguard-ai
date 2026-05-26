/**
 * openDatabase + migration runner contract.
 * 開啟資料庫 + 遷移執行器契約。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import { openDatabase } from '../src/db/connection.js';
import { migrations } from '../src/db/migrations.js';

describe('openDatabase', () => {
  let tmp: string;
  let db: Database.Database | null;

  beforeEach(() => {
    tmp = join(tmpdir(), `pgm-conn-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmp, { recursive: true });
    db = null;
  });

  afterEach(() => {
    if (db) {
      try {
        db.close();
      } catch {
        /* already closed */
      }
      db = null;
    }
    rmSync(tmp, { recursive: true, force: true });
  });

  it('applies all migrations on a fresh DB', () => {
    db = openDatabase({ path: join(tmp, 'manager.db') });
    const rows = db
      .prepare('SELECT version FROM schema_version ORDER BY version ASC')
      .all() as Array<{ version: number }>;
    expect(rows.map((r) => r.version)).toEqual(migrations.map((m) => m.version));
  });

  it('is idempotent: opening twice does not re-run migrations', () => {
    db = openDatabase({ path: join(tmp, 'manager.db') });
    const first = (
      db.prepare('SELECT COUNT(*) AS n FROM schema_version').get() as { n: number }
    ).n;
    db.close();

    db = openDatabase({ path: join(tmp, 'manager.db') });
    const second = (
      db.prepare('SELECT COUNT(*) AS n FROM schema_version').get() as { n: number }
    ).n;
    expect(second).toBe(first);
  });

  it.runIf(process.platform !== 'win32')('sets DB file mode 0600', () => {
    const path = join(tmp, 'manager.db');
    db = openDatabase({ path });

    // Write something so WAL files materialize, then we can check their mode too.
    db.exec(`INSERT INTO schema_version (version, applied_at) VALUES (999, datetime('now'))`);

    expect(statSync(path).mode & 0o777).toBe(0o600);
    for (const suffix of ['-wal', '-shm']) {
      const aux = path + suffix;
      if (existsSync(aux)) {
        expect(statSync(aux).mode & 0o777).toBe(0o600);
      }
    }
  });

  it('creates the parent directory if missing', () => {
    const path = join(tmp, 'nested', 'sub', 'manager.db');
    db = openDatabase({ path });
    expect(existsSync(path)).toBe(true);
  });

  it(':memory: works for fast tests', () => {
    db = openDatabase({ path: ':memory:' });
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'")
      .all();
    expect(rows).toHaveLength(1);
  });
});
