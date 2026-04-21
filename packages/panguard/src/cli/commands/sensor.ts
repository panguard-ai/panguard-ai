/**
 * `panguard sensor` - Show this machine's Threat Cloud sensor registration
 *
 * A "sensor" is a PanGuard install that's registered with tc.panguard.ai and
 * contributes anonymous detections to the community defense network. This
 * command lets a user verify their sensor status, see their anonymous sensor
 * ID, rule sync state, and how to opt out.
 *
 * Runs purely off the local cache files — never calls out to TC, never reveals
 * any secret key to stdout. If the user hasn't completed `pga up` yet, the
 * output says so and points at the right command.
 *
 * @module @panguard-ai/panguard/cli/commands/sensor
 */

import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { c, symbols } from '@panguard-ai/core';
import { detectLang } from '../interactive/lang.js';

type Lang = 'en' | 'zh-TW';
const t = (lang: Lang, en: string, zh: string): string => (lang === 'zh-TW' ? zh : en);

interface SensorStatus {
  registered: boolean;
  sensorId: string | null;
  tcEndpoint: string;
  tcReachable: 'connected' | 'offline' | 'disabled';
  rulesLoaded: number | null;
  lastSync: string | null;
  queueSize: number | null;
  telemetryDisabled: boolean;
  keyProvisioned: boolean;
}

function readJson<T>(path: string): T | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function collectSensorStatus(): SensorStatus {
  const home = homedir();

  // Anonymous client ID (sensor identity) — UUID only, no PII
  const clientIdPath = join(home, '.panguard', 'client-id');
  let sensorId: string | null = null;
  try {
    if (existsSync(clientIdPath)) {
      sensorId = readFileSync(clientIdPath, 'utf-8').trim() || null;
    }
  } catch {
    /* leave null */
  }

  // Presence of TC API key (do NOT read or print the key itself)
  const keyPath = join(home, '.panguard', 'tc-client-key');
  const keyProvisioned = existsSync(keyPath);

  // Telemetry opt-out config
  const guardConfig = readJson<{ telemetryEnabled?: boolean }>(
    join(home, '.panguard-guard', 'config.json')
  );
  const telemetryDisabled = guardConfig?.telemetryEnabled === false;

  // TC sync cache
  const cache = readJson<{
    lastSync?: string;
    uniqueRulesCount?: number;
    queueSize?: number;
  }>(join(home, '.panguard-guard', 'threat-cloud-cache.json'));

  const rulesLoaded =
    typeof cache?.uniqueRulesCount === 'number' && cache.uniqueRulesCount > 0
      ? cache.uniqueRulesCount
      : null;
  const lastSync = cache?.lastSync ?? null;
  const queueSize = typeof cache?.queueSize === 'number' ? cache.queueSize : null;

  let tcReachable: SensorStatus['tcReachable'];
  if (telemetryDisabled) {
    tcReachable = 'disabled';
  } else if (lastSync) {
    tcReachable = 'connected';
  } else {
    tcReachable = 'offline';
  }

  return {
    registered: !!sensorId && keyProvisioned,
    sensorId,
    tcEndpoint: process.env['THREAT_CLOUD_URL'] ?? 'https://tc.panguard.ai',
    tcReachable,
    rulesLoaded,
    lastSync,
    queueSize,
    telemetryDisabled,
    keyProvisioned,
  };
}

function formatRelative(iso: string, lang: Lang): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const s = Math.max(0, Math.round((now - then) / 1000));
    if (s < 60) return t(lang, `${s}s ago`, `${s} 秒前`);
    const m = Math.round(s / 60);
    if (m < 60) return t(lang, `${m}m ago`, `${m} 分前`);
    const h = Math.round(m / 60);
    if (h < 48) return t(lang, `${h}h ago`, `${h} 小時前`);
    const d = Math.round(h / 24);
    return t(lang, `${d}d ago`, `${d} 天前`);
  } catch {
    return iso;
  }
}

function renderHuman(status: SensorStatus, lang: Lang): void {
  const pass = c.safe(symbols.pass);
  const warn = c.caution(symbols.warn);
  const fail = c.critical(symbols.fail);

  console.log('');
  console.log(`  ${c.bold(t(lang, 'THREAT CLOUD SENSOR', '威脅雲感測器'))}`);
  console.log(`  ${c.dim('─'.repeat(50))}`);

  // Registration state
  if (!status.registered) {
    console.log(
      `  ${warn} ${t(lang, 'Not yet registered', '尚未註冊')}  ${c.dim(t(lang, '— run: pga up', '— 執行:pga up'))}`
    );
    console.log('');
    return;
  }

  const shortId = status.sensorId ? status.sensorId.slice(0, 8) : '—';
  console.log(
    `  ${pass} ${t(lang, 'Registered', '已註冊')}            ${t(lang, 'sensor', '感測器')} ${c.sage(shortId)}`
  );
  console.log(`  ${c.dim(t(lang, 'Endpoint', '端點'))}             ${status.tcEndpoint}`);

  // Connection
  const connLabel =
    status.tcReachable === 'connected'
      ? c.sage(t(lang, 'connected', '已連線'))
      : status.tcReachable === 'disabled'
        ? c.dim(t(lang, 'disabled (telemetry opt-out)', '已停用(遙測選擇退出)'))
        : c.caution(t(lang, 'offline — will sync when online', '離線 — 上線時自動同步'));
  console.log(`  ${c.dim(t(lang, 'Connection', '連線'))}           ${connLabel}`);

  // Rules loaded
  if (status.rulesLoaded != null) {
    console.log(
      `  ${c.dim(t(lang, 'Rules loaded', '規則'))}         ${status.rulesLoaded} ${t(lang, 'detection rules', '條偵測規則')}`
    );
  }

  // Last sync
  if (status.lastSync) {
    console.log(
      `  ${c.dim(t(lang, 'Last sync', '上次同步'))}            ${formatRelative(status.lastSync, lang)}`
    );
  }

  // Upload queue
  if (status.queueSize != null && status.queueSize > 0) {
    console.log(
      `  ${warn} ${t(lang, 'Upload queue', '上傳佇列')}         ${status.queueSize} ${t(lang, 'pending', '等待中')}`
    );
  }

  console.log('');

  // What you're sending
  if (!status.telemetryDisabled) {
    console.log(`  ${c.bold(t(lang, 'WHAT THIS SENSOR SHARES', '感測器分享內容'))}`);
    console.log(
      `  ${c.dim('•')} ${t(lang, 'Anonymous rule hits (rule ID + attack class)', '匿名規則命中(規則 ID + 攻擊類型)')}`
    );
    console.log(
      `  ${c.dim('•')} ${t(lang, 'Aggregate scan counts (# skills audited)', '掃描統計(已稽核技能數)')}`
    );
    console.log(
      `  ${c.dim('•')} ${t(lang, 'Anonymous sensor ID (UUID, no email or hostname)', '匿名感測器 ID(UUID,無 email 或主機名)')}`
    );
    console.log('');
    console.log(`  ${c.bold(t(lang, 'WHAT IT NEVER SENDS', '絕不傳送'))}`);
    console.log(
      `  ${c.dim('•')} ${t(lang, 'Skill source code or file contents', '技能原始碼或檔案內容')}`
    );
    console.log(`  ${c.dim('•')} ${t(lang, 'API keys or credentials', 'API 金鑰或憑證')}`);
    console.log(
      `  ${c.dim('•')} ${t(lang, 'Hostname, IP address, or user identity', '主機名、IP、或使用者身分')}`
    );
    console.log('');
  } else {
    console.log(
      `  ${fail} ${t(lang, 'Telemetry is disabled. No data leaves this machine.', '遙測已停用,此機器不對外傳送資料。')}`
    );
    console.log('');
  }

  // Controls
  console.log(`  ${c.bold(t(lang, 'CONTROLS', '控制'))}`);
  if (status.telemetryDisabled) {
    console.log(
      `  ${c.dim(t(lang, 'Re-enable:', '重新啟用:'))}         ${c.sage('pga config set telemetry true')}`
    );
  } else {
    console.log(
      `  ${c.dim(t(lang, 'Opt out:', '停用:'))}            ${c.sage('pga config set telemetry false')}`
    );
  }
  console.log(`  ${c.dim(t(lang, 'Privacy policy:', '隱私政策:'))}      panguard.ai/privacy`);
  console.log('');
}

export function sensorCommand(): Command {
  const cmd = new Command('sensor').description('Show Threat Cloud sensor registration status');

  cmd
    .command('status', { isDefault: true })
    .description('Show sensor registration, sync state, and opt-out info')
    .option('--json', 'Output as JSON')
    .option('--lang <language>', 'Language override (en | zh-TW)')
    .action((opts: { json?: boolean; lang?: string }) => {
      const status = collectSensorStatus();
      if (opts.json) {
        // Deliberately omit the tc-client-key path/value from JSON too
        process.stdout.write(JSON.stringify(status, null, 2) + '\n');
        return;
      }
      const lang = (opts.lang === 'zh-TW' || opts.lang === 'en' ? opts.lang : detectLang()) as Lang;
      renderHuman(status, lang);
    });

  return cmd;
}
