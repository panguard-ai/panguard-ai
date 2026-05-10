/**
 * `panguard status` - Enhanced system status dashboard
 * `panguard status` - 增強版系統狀態儀表板
 *
 * @module @panguard-ai/panguard/cli/commands/status
 */

import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  c,
  symbols,
  divider,
  statusPanel,
  scoreDisplay,
  table,
  timeAgo,
  header,
  scoreToGrade,
} from '@panguard-ai/core';
import type { StatusItem, TableColumn } from '@panguard-ai/core';
import { readConfig } from '../../init/config-writer.js';
import type { Lang } from '../../init/types.js';

export function statusCommand(): Command {
  return new Command('status')
    .description('Show system status dashboard')
    .option('--json', 'Output as JSON')
    .option('--lang <language>', 'Language override')
    .action(async (opts: { json?: boolean; lang?: string }) => {
      await showStatus(opts);
    });
}

interface SystemStatus {
  configLoaded: boolean;
  configPath: string;
  guard: {
    running: boolean;
    mode: string;
    pid?: number;
  } | null;
  lastScan: {
    timestamp: string;
    riskScore: number;
    findings: number;
    grade: string;
  } | null;
  notifications: {
    channel: string;
    configured: boolean;
  };
  trap: {
    enabled: boolean;
    services: string[];
  } | null;
  ai: {
    preference: string;
    provider?: string;
  };
  modules: Record<string, { enabled: boolean; status: string }>;
}

async function showStatus(opts: { json?: boolean; lang?: string }): Promise<void> {
  // Silence structured logs before any lazy imports — platform-detector and
  // config-reader fire info/warn lines that leak into the human-readable
  // status panel and break --json output. Status owns the screen.
  const { setLogLevel } = await import('@panguard-ai/core');
  setLogLevel('silent');

  const config = readConfig();
  const lang: Lang = (opts.lang as Lang) ?? config?.meta?.language ?? 'en';

  const status = collectStatus(config);

  // JSON output
  if (opts.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  // ── Banner ──────────────────────────────────────────────
  console.log('');
  console.log(
    header(
      lang === 'zh-TW' ? '\u7CFB\u7D71\u72C0\u614B\u5100\u8868\u677F' : 'System Status Dashboard'
    )
  );

  // ── No config: show basic system info ──────────────────
  if (!status.configLoaded) {
    const os = await import('node:os');
    const guardPidPath = join(homedir(), '.panguard-guard', 'panguard-guard.pid');
    let guardRunning = false;
    if (existsSync(guardPidPath)) {
      try {
        const pid = parseInt(readFileSync(guardPidPath, 'utf-8').trim(), 10);
        process.kill(pid, 0);
        guardRunning = true;
      } catch {
        // not running
      }
    }

    const configFileExists = existsSync(status.configPath);

    const basicItems: StatusItem[] = [
      {
        label: lang === 'zh-TW' ? '\u4E3B\u6A5F' : 'Hostname',
        value: c.sage(os.hostname()),
      },
      {
        label: lang === 'zh-TW' ? '\u4F5C\u696D\u7CFB\u7D71' : 'OS',
        value: c.dim(`${os.type()} ${os.release()}`),
      },
      {
        label: lang === 'zh-TW' ? '\u5B88\u8B77\u5F15\u64CE' : 'Guard Engine',
        value: guardRunning
          ? c.safe(lang === 'zh-TW' ? '\u904B\u884C\u4E2D' : 'RUNNING')
          : c.dim(lang === 'zh-TW' ? '\u672A\u904B\u884C' : 'Not running'),
        status: guardRunning ? 'safe' : undefined,
      },
      configFileExists
        ? {
            label: lang === 'zh-TW' ? '\u914D\u7F6E\u72C0\u614B' : 'Config',
            value: c.dim(
              lang === 'zh-TW'
                ? '\u90E8\u5206\u5B8C\u6210 \u00B7 \u8DD1 pga setup \u4EE5\u5B8C\u6210'
                : 'Partial \u00B7 run pga setup to finish'
            ),
          }
        : {
            label: lang === 'zh-TW' ? '\u914D\u7F6E\u72C0\u614B' : 'Config',
            value: c.caution(lang === 'zh-TW' ? '\u672A\u521D\u59CB\u5316' : 'Not initialized'),
            status: 'caution' as const,
          },
    ];

    console.log(
      statusPanel(
        lang === 'zh-TW' ? '\u7CFB\u7D71\u72C0\u614B / System Status' : 'System Status',
        basicItems
      )
    );
    console.log(
      `  ${symbols.info} ${
        lang === 'zh-TW'
          ? '\u57F7\u884C \u300Cpga setup\u300D\u958B\u59CB\u8A2D\u5B9A\u3002'
          : 'Run "pga setup" to get started.'
      }`
    );
    console.log('');
    // Fall through to show installed skills even without config
  }

  // ── System Status ──────────────────────────────────────
  const systemItems: StatusItem[] = [];

  // Guard status
  if (status.guard) {
    systemItems.push({
      label: lang === 'zh-TW' ? '\u5B88\u8B77\u5F15\u64CE' : 'Guard Engine',
      value: status.guard.running
        ? `${status.guard.mode} mode (PID: ${status.guard.pid})`
        : lang === 'zh-TW'
          ? '\u672A\u904B\u884C'
          : 'Not running',
      status: status.guard.running ? 'safe' : 'caution',
    });
  }

  // AI status
  systemItems.push({
    label: 'AI',
    value: status.ai.provider
      ? `${status.ai.provider} (${status.ai.preference})`
      : status.ai.preference === 'rules_only'
        ? lang === 'zh-TW'
          ? '\u50C5\u898F\u5247\u5F15\u64CE'
          : 'Rules only'
        : lang === 'zh-TW'
          ? '\u672A\u914D\u7F6E'
          : 'Not configured',
    status: status.ai.provider ? 'safe' : undefined,
  });

  // Notification status
  systemItems.push({
    label: lang === 'zh-TW' ? '\u901A\u77E5' : 'Notifications',
    value: status.notifications.configured
      ? status.notifications.channel.toUpperCase()
      : lang === 'zh-TW'
        ? '\u672A\u914D\u7F6E'
        : 'Not configured',
    status: status.notifications.configured ? 'safe' : 'caution',
  });

  // Trap status
  if (status.trap?.enabled) {
    systemItems.push({
      label: lang === 'zh-TW' ? '\u871C\u7F50' : 'Honeypot',
      value: status.trap.services.join(', ').toUpperCase(),
      status: 'safe',
    });
  }

  console.log(
    statusPanel(
      lang === 'zh-TW' ? '\u7CFB\u7D71\u72C0\u614B / System Status' : 'System Status',
      systemItems
    )
  );

  // ── Last Scan Results ──────────────────────────────────
  if (status.lastScan) {
    console.log(divider(lang === 'zh-TW' ? '\u4E0A\u6B21\u6383\u63CF' : 'Last Scan'));
    console.log(scoreDisplay(status.lastScan.riskScore, status.lastScan.grade));
    console.log(
      `  ${status.lastScan.findings} ${lang === 'zh-TW' ? '\u500B\u767C\u73FE' : 'finding(s)'} ${c.dim('\u00B7')} ${timeAgo(status.lastScan.timestamp)}`
    );
    console.log('');
  }

  // ── Module Status Table ─────────────────────────────────
  console.log(divider(lang === 'zh-TW' ? '\u6A21\u7D44\u72C0\u614B' : 'Module Status'));
  console.log('');

  const columns: TableColumn[] = [
    { header: '#', key: 'num', width: 3, align: 'right' },
    { header: lang === 'zh-TW' ? '\u6A21\u7D44' : 'Module', key: 'module', width: 22 },
    {
      header: lang === 'zh-TW' ? '\u72C0\u614B' : 'Status',
      key: 'status',
      width: 10,
      color: (v: string) => {
        if (v === 'active' || v === 'ready') return c.safe(v);
        if (v === 'disabled') return c.dim(v);
        return c.caution(v);
      },
    },
  ];

  const moduleNames: Record<string, Record<Lang, string>> = {
    guard: { en: 'Panguard Guard', 'zh-TW': 'Panguard Guard (\u5B88\u8B77)' },
    scan: { en: 'Panguard Scan', 'zh-TW': 'Panguard Scan (\u6383\u63CF)' },
    chat: { en: 'Panguard Chat', 'zh-TW': 'Panguard Chat (\u901A\u77E5)' },
    trap: { en: 'Panguard Trap', 'zh-TW': 'Panguard Trap (\u871C\u7F50)' },
    report: { en: 'Panguard Report', 'zh-TW': 'Panguard Report (\u5831\u544A)' },
    dashboard: { en: 'Dashboard', 'zh-TW': 'Dashboard (\u5100\u8868\u677F)' },
  };

  const rows = Object.entries(status.modules).map(([key, mod], i) => ({
    num: String(i + 1),
    module: moduleNames[key]?.[lang] ?? key,
    status: mod.status,
  }));

  console.log(table(columns, rows));
  console.log('');

  // ── Installed Skills + Security Status ───────────────────
  try {
    type DiscoverFn = () => Promise<ReadonlyArray<{ name: string; platformId: string }>>;
    let discoverFn: DiscoverFn;
    // Try package import first (works in npm install -g), then file URL (monorepo dev)
    const { resolve } = await import('node:path');
    const { pathToFileURL } = await import('node:url');
    const candidates = [
      // Subpath exposes discoverAllSkills (root export doesn't). Same
      // pattern as `pga setup` — keeps status in lockstep with setup's
      // skill-discovery wiring.
      '@panguard-ai/panguard-mcp/config',
      '@panguard-ai/panguard-mcp',
      pathToFileURL(resolve(process.cwd(), 'packages/panguard-mcp/dist/config/index.js')).href,
    ];
    for (const candidate of candidates) {
      try {
        const mcp = (await import(candidate)) as { discoverAllSkills?: DiscoverFn };
        if (typeof mcp.discoverAllSkills === 'function') {
          discoverFn = mcp.discoverAllSkills;
          break;
        }
      } catch {
        /* try next */
      }
    }
    if (!discoverFn!) throw new Error('No MCP discovery available');
    const installedSkills = await discoverFn();

    // Load whitelist for cross-reference
    const whitelistPath = join(homedir(), '.panguard-guard', 'skill-whitelist.json');
    const whitelistNames = new Set<string>();
    if (existsSync(whitelistPath)) {
      try {
        const wl = JSON.parse(readFileSync(whitelistPath, 'utf-8')) as {
          whitelist?: Array<{ name: string; normalizedName?: string }>;
        };
        for (const s of wl.whitelist ?? []) {
          whitelistNames.add(s.name.toLowerCase());
          if (s.normalizedName) whitelistNames.add(s.normalizedName.toLowerCase());
        }
      } catch {
        /* ignore */
      }
    }

    console.log(
      divider(
        lang === 'zh-TW'
          ? `Installed Skills (${installedSkills.length} \u500B\u5DF2\u5B89\u88DD)`
          : `Installed Skills (${installedSkills.length})`
      )
    );
    console.log('');

    if (installedSkills.length === 0) {
      console.log(
        `  ${c.dim(lang === 'zh-TW' ? '\u672A\u5075\u6E2C\u5230\u5DF2\u5B89\u88DD\u7684 skill' : 'No installed skills detected')}`
      );
    } else {
      const skillColumns: TableColumn[] = [
        { header: '#', key: 'num', width: 3, align: 'right' },
        { header: 'Skill', key: 'name', width: 30 },
        { header: lang === 'zh-TW' ? '\u5E73\u53F0' : 'Platform', key: 'platform', width: 15 },
        {
          header: lang === 'zh-TW' ? '\u72C0\u614B' : 'Status',
          key: 'status',
          width: 12,
          color: (v: string) => {
            if (v === 'SAFE') return c.safe(v);
            if (v === 'UNKNOWN') return c.caution(v);
            return c.critical(v);
          },
        },
      ];

      const skillRows = installedSkills.map((s, i) => {
        const isSafe = whitelistNames.has(s.name.toLowerCase());
        return {
          num: String(i + 1),
          name: s.name.length > 28 ? s.name.slice(0, 26) + '..' : s.name,
          platform: s.platformId,
          status: isSafe ? 'SAFE' : 'UNKNOWN',
        };
      });

      // Show summary first
      const safeCount = skillRows.filter((r) => r.status === 'SAFE').length;
      const unknownCount = skillRows.filter((r) => r.status === 'UNKNOWN').length;
      console.log(
        `  ${c.safe(String(safeCount))} safe  ${c.dim('|')}  ${unknownCount > 0 ? c.caution(String(unknownCount)) : c.dim('0')} unscanned`
      );
      console.log(
        `  ${c.dim(lang === 'zh-TW' ? '\u57F7\u884C pga setup \u6383\u63CF\u5168\u90E8 skill' : 'Run pga setup to scan all skills')}`
      );
      console.log('');

      // Show table (limit to 20 rows to avoid flood)
      const display = skillRows.slice(0, 20);
      console.log(table(skillColumns, display));
      if (skillRows.length > 20) {
        console.log(c.dim(`  ... and ${skillRows.length - 20} more`));
      }
      console.log('');
    }
  } catch (skillErr) {
    // MCP package not available — show hint
    console.log(divider('Installed Skills'));
    console.log('');
    console.log(
      `  ${c.dim('Could not discover skills: ' + (skillErr instanceof Error ? skillErr.message : String(skillErr)))}`
    );
    console.log('');
  }

  // ── Today's Activity ──────────────────────────────────────
  try {
    const summaryPath = join(homedir(), '.panguard-guard', 'daily-summary.json');
    if (existsSync(summaryPath)) {
      const summaryRaw = readFileSync(summaryPath, 'utf-8');
      const history = JSON.parse(summaryRaw) as Array<{
        eventsProcessed?: number;
        threatsDetected?: number;
        threatsBlocked?: number;
        skillsAudited?: number;
      }>;
      const latest = history[history.length - 1];
      if (latest) {
        console.log(
          divider(
            lang === 'zh-TW' ? "Today's Activity (\u4ECA\u65E5\u6D3B\u52D5)" : "Today's Activity"
          )
        );
        console.log('');
        console.log(
          `  ${c.sage('\u25CF')} ${c.bold(lang === 'zh-TW' ? '\u4E8B\u4EF6:' : 'Events:')}     ${c.sage((latest.eventsProcessed ?? 0).toLocaleString())} processed`
        );
        const threats = latest.threatsDetected ?? 0;
        const blocked = latest.threatsBlocked ?? 0;
        console.log(
          `  ${c.sage('\u25CF')} ${c.bold(lang === 'zh-TW' ? '\u5A01\u8105:' : 'Threats:')}    ${threats > 0 ? c.caution(String(threats)) : c.dim('0')} detected, ${c.safe(String(blocked))} blocked`
        );
        const audited = latest.skillsAudited ?? 0;
        if (audited > 0) {
          console.log(
            `  ${c.sage('\u25CF')} ${c.bold(lang === 'zh-TW' ? '\u6280\u80FD:' : 'Skills:')}    ${c.sage(String(audited))} audited`
          );
        }
        console.log('');
      }
    }
  } catch {
    // Skip activity section if not available
  }
}

function collectStatus(config: ReturnType<typeof readConfig>): SystemStatus {
  const configPath = join(homedir(), '.panguard', 'config.json');

  if (!config) {
    return {
      configLoaded: false,
      configPath,
      guard: null,
      lastScan: null,
      notifications: { channel: 'none', configured: false },
      trap: null,
      ai: { preference: 'rules_only' },
      modules: {},
    };
  }

  // Check if guard is running (PID file)
  const guardPidPath = join(homedir(), '.panguard-guard', 'panguard-guard.pid');
  let guardRunning = false;
  let guardPid: number | undefined;

  if (existsSync(guardPidPath)) {
    try {
      const pid = parseInt(readFileSync(guardPidPath, 'utf-8').trim(), 10);
      // Check if process is alive
      process.kill(pid, 0);
      guardRunning = true;
      guardPid = pid;
    } catch {
      guardRunning = false;
    }
  }

  // Check for last scan result
  let lastScan: SystemStatus['lastScan'] = null;
  const scanResultPath = join(homedir(), '.panguard', 'last-scan.json');
  if (existsSync(scanResultPath)) {
    try {
      const scanData = JSON.parse(readFileSync(scanResultPath, 'utf-8'));
      lastScan = {
        timestamp: scanData.scannedAt ?? new Date().toISOString(),
        riskScore: scanData.riskScore ?? 0,
        findings: scanData.findings?.length ?? 0,
        grade: scoreToGrade(scanData.riskScore ?? 0),
      };
    } catch {
      // ignore
    }
  }

  // Build module status
  const modules: Record<string, { enabled: boolean; status: string }> = {};
  for (const [key, enabled] of Object.entries(config.modules)) {
    modules[key] = {
      enabled,
      status: !enabled
        ? 'disabled'
        : key === 'guard'
          ? guardRunning
            ? 'active'
            : 'ready'
          : 'ready',
    };
  }

  return {
    configLoaded: true,
    configPath,
    guard: config.modules.guard
      ? {
          running: guardRunning,
          mode: config.guard.mode,
          pid: guardPid,
        }
      : null,
    lastScan,
    notifications: {
      channel: config.notifications.channel,
      configured: config.notifications.channel !== 'none',
    },
    trap: config.modules.trap
      ? {
          enabled: config.trap.enabled,
          services: config.trap.services,
        }
      : null,
    ai: {
      preference: config.ai.preference,
      provider: config.ai.provider,
    },
    modules,
  };
}

// scoreToGrade imported from @panguard-ai/core
// Uses canonical thresholds: A>=90, B>=75, C>=60, D>=40, F<40
