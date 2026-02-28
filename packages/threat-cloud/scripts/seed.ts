#!/usr/bin/env npx tsx
/**
 * Threat Cloud Seed Script
 * 威脅雲種子資料匯入腳本
 *
 * Fetches public threat intelligence feeds and imports them into
 * the Threat Cloud database to provide baseline data.
 *
 * Usage:
 *   npx tsx scripts/seed.ts [--db ./threat-cloud.db] [--feeds all]
 *   npx tsx scripts/seed.ts --feeds ipsum,feodo,blocklist
 *
 * Available feeds:
 *   ipsum       - IPsum aggregated malicious IPs (~50,000 IPs)
 *   feodo       - Feodo Tracker C2 IPs (~300 IPs)
 *   blocklist   - Blocklist.de attack IPs (~20,000 IPs)
 *   spamhaus    - Spamhaus DROP netblocks (~1,000 ranges)
 *   urlhaus     - URLhaus malicious URLs (~10,000 URLs)
 *   threatfox   - ThreatFox IoCs via API (~5,000 IoCs)
 *   all         - All of the above (default)
 */

import { ThreatCloudDB } from '../src/database.js';
import { IoCStore } from '../src/ioc-store.js';

// ---------------------------------------------------------------------------
// Feed definitions
// ---------------------------------------------------------------------------

interface FeedConfig {
  name: string;
  url: string;
  type: 'ip' | 'domain' | 'url' | 'hash_sha256' | 'hash_md5';
  threatType: string;
  confidence: number;
  parser: (text: string) => Array<{ value: string; tags?: string[]; metadata?: Record<string, string> }>;
}

const FEEDS: Record<string, FeedConfig> = {
  ipsum: {
    name: 'IPsum (Aggregated Malicious IPs)',
    url: 'https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt',
    type: 'ip',
    threatType: 'malicious',
    confidence: 70,
    parser: (text) => {
      const lines = text.split('\n');
      const results: Array<{ value: string; tags: string[] }> = [];
      for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        const ip = parts[0];
        const score = Number(parts[1] ?? '1');
        if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
          // Only import IPs seen in 3+ blocklists (higher confidence)
          if (score >= 3) {
            results.push({ value: ip, tags: [`ipsum-score:${score}`] });
          }
        }
      }
      return results;
    },
  },

  feodo: {
    name: 'Feodo Tracker (C2 IPs)',
    url: 'https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt',
    type: 'ip',
    threatType: 'c2',
    confidence: 90,
    parser: (text) => {
      const lines = text.split('\n');
      const results: Array<{ value: string; tags: string[] }> = [];
      for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        const ip = line.trim();
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
          results.push({ value: ip, tags: ['feodo-tracker', 'botnet'] });
        }
      }
      return results;
    },
  },

  blocklist: {
    name: 'Blocklist.de (Attack IPs)',
    url: 'https://lists.blocklist.de/lists/all.txt',
    type: 'ip',
    threatType: 'scanner',
    confidence: 60,
    parser: (text) => {
      const lines = text.split('\n');
      const results: Array<{ value: string; tags: string[] }> = [];
      for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        const ip = line.trim();
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
          results.push({ value: ip, tags: ['blocklist-de'] });
        }
      }
      return results;
    },
  },

  spamhaus: {
    name: 'Spamhaus DROP (Hijacked Netblocks)',
    url: 'https://www.spamhaus.org/drop/drop.txt',
    type: 'ip',
    threatType: 'malicious',
    confidence: 95,
    parser: (text) => {
      const lines = text.split('\n');
      const results: Array<{ value: string; tags: string[]; metadata: Record<string, string> }> = [];
      for (const line of lines) {
        if (line.startsWith(';') || !line.trim()) continue;
        // Format: "x.x.x.x/xx ; SBLxxxxx"
        const parts = line.split(';');
        const cidr = parts[0]?.trim();
        const sbl = parts[1]?.trim() ?? '';
        if (cidr) {
          // Extract the network address from CIDR
          const ip = cidr.split('/')[0];
          if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
            results.push({
              value: ip,
              tags: ['spamhaus-drop', sbl].filter(Boolean),
              metadata: { cidr, sblRef: sbl },
            });
          }
        }
      }
      return results;
    },
  },

  urlhaus: {
    name: 'URLhaus (Malicious URLs)',
    url: 'https://urlhaus.abuse.ch/downloads/text_recent/',
    type: 'url',
    threatType: 'malware_distribution',
    confidence: 80,
    parser: (text) => {
      const lines = text.split('\n');
      const results: Array<{ value: string; tags: string[] }> = [];
      for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        const url = line.trim();
        if (url.startsWith('http://') || url.startsWith('https://')) {
          results.push({ value: url, tags: ['urlhaus'] });
        }
      }
      return results;
    },
  },

  threatfox: {
    name: 'ThreatFox (Mixed IoCs via API)',
    url: 'https://threatfox-api.abuse.ch/api/v1/',
    type: 'ip', // will be overridden per entry
    threatType: 'malware',
    confidence: 85,
    parser: (text) => {
      try {
        const json = JSON.parse(text) as {
          query_status: string;
          data?: Array<{
            ioc: string;
            ioc_type: string;
            threat_type: string;
            malware: string;
            tags: string[] | null;
          }>;
        };
        if (json.query_status !== 'ok' || !json.data) return [];

        const results: Array<{ value: string; tags: string[] }> = [];
        for (const entry of json.data.slice(0, 5000)) {
          const tags = [...(entry.tags ?? []), entry.malware].filter(Boolean);
          results.push({ value: entry.ioc, tags });
        }
        return results;
      } catch {
        return [];
      }
    },
  },
};

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function fetchFeed(feed: FeedConfig): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const options: RequestInit = { signal: controller.signal };

    // ThreatFox requires POST with JSON body
    if (feed.url.includes('threatfox-api')) {
      options.method = 'POST';
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify({ query: 'get_iocs', days: 7 });
    }

    const res = await fetch(feed.url, options);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Import logic
// ---------------------------------------------------------------------------

function importFeed(
  store: IoCStore,
  feed: FeedConfig,
  entries: Array<{ value: string; tags?: string[]; metadata?: Record<string, string> }>
): { imported: number; duplicates: number; errors: number } {
  let imported = 0;
  let duplicates = 0;
  let errors = 0;

  for (const entry of entries) {
    try {
      // Auto-detect type for ThreatFox entries
      let iocType = feed.type;
      if (feed.url.includes('threatfox')) {
        iocType = store.detectType(entry.value);
      }

      const result = store.upsertIoC({
        type: iocType,
        value: entry.value,
        threatType: feed.threatType,
        source: `feed:${feed.name.split(' ')[0]?.toLowerCase()}`,
        confidence: feed.confidence,
        tags: entry.tags,
        metadata: entry.metadata,
      });

      if (result.sightings === 1) {
        imported++;
      } else {
        duplicates++;
      }
    } catch {
      errors++;
    }
  }

  return { imported, duplicates, errors };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(): { dbPath: string; feedNames: string[] } {
  const args = process.argv.slice(2);
  let dbPath = './threat-cloud.db';
  let feedNames = ['all'];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--db':
        dbPath = args[++i] ?? dbPath;
        break;
      case '--feeds':
        feedNames = (args[++i] ?? 'all').split(',');
        break;
      case '--help':
        console.log(`
Threat Cloud Seed Script

Usage: npx tsx scripts/seed.ts [options]

Options:
  --db <path>        Database path (default: ./threat-cloud.db)
  --feeds <names>    Comma-separated feed names or "all" (default: all)
  --help             Show this help

Available feeds: ${Object.keys(FEEDS).join(', ')}
`);
        process.exit(0);
    }
  }

  return { dbPath, feedNames };
}

async function main(): Promise<void> {
  const { dbPath, feedNames } = parseArgs();

  console.log('=== Threat Cloud Seed Script ===\n');
  console.log(`Database: ${dbPath}`);

  const dbWrapper = new ThreatCloudDB(dbPath);
  const store = new IoCStore(dbWrapper.getDB());

  const selectedFeeds =
    feedNames.includes('all')
      ? Object.values(FEEDS)
      : feedNames
          .map((n) => FEEDS[n.trim()])
          .filter((f): f is FeedConfig => f !== undefined);

  if (selectedFeeds.length === 0) {
    console.error('No valid feeds selected. Available:', Object.keys(FEEDS).join(', '));
    process.exit(1);
  }

  console.log(`Feeds: ${selectedFeeds.map((f) => f.name).join(', ')}\n`);

  let totalImported = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;

  for (const feed of selectedFeeds) {
    process.stdout.write(`[*] ${feed.name}... `);

    try {
      const text = await fetchFeed(feed);
      const entries = feed.parser(text);
      process.stdout.write(`${entries.length} entries parsed, `);

      const result = importFeed(store, feed, entries);
      totalImported += result.imported;
      totalDuplicates += result.duplicates;
      totalErrors += result.errors;

      console.log(
        `${result.imported} imported, ${result.duplicates} merged, ${result.errors} errors`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAILED: ${msg}`);
      totalErrors++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total imported:   ${totalImported}`);
  console.log(`Total merged:     ${totalDuplicates}`);
  console.log(`Total errors:     ${totalErrors}`);

  // Show final counts
  const counts = store.getIoCCountsByType();
  const totalActive = store.getTotalActiveCount();
  console.log(`\nDatabase totals: ${totalActive} active IoCs`);
  for (const [type, count] of Object.entries(counts)) {
    console.log(`  ${type}: ${count}`);
  }

  dbWrapper.close();
  console.log('\nDone.');
}

void main();
