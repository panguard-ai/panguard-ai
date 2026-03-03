/**
 * Panguard MCP - Guard Tools
 * Panguard MCP - 守護工具
 *
 * Implements panguard_guard_start, panguard_guard_stop, panguard_status,
 * and panguard_alerts MCP tools.
 * 實作 panguard_guard_start、panguard_guard_stop、panguard_status 和 panguard_alerts MCP 工具。
 *
 * @module @panguard-ai/panguard-mcp/tools/guard-tools
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Resolve the guard data directory from args or default.
 * 從參數或預設值解析守護資料目錄。
 */
function resolveDataDir(args: Record<string, unknown>): string {
  return (args['dataDir'] as string) ?? path.join(os.homedir(), '.panguard-guard');
}

/**
 * Execute panguard_guard_start — start the real-time threat monitoring daemon.
 * 執行 panguard_guard_start — 啟動即時威脅監控常駐程式。
 *
 * NOTE: The MCP server does not directly spawn daemon processes to avoid
 * interfering with the stdio transport. Instead it validates the data directory
 * and returns instructions for the user/agent to run panguard-guard CLI.
 * 注意：MCP 伺服器不直接生成常駐進程以避免干擾 stdio 傳輸。
 * 改為驗證資料目錄並返回讓用戶/代理執行 panguard-guard CLI 的指示。
 */
export async function executeGuardStart(args: Record<string, unknown>) {
  const dataDir = resolveDataDir(args);
  const mode = (args['mode'] as string) ?? 'learning';

  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            status: 'ready',
            dataDir,
            mode,
            message:
              'Guard engine is ready to start. Run the following command in a terminal to start real-time monitoring:',
            command: `panguard-guard start --mode ${mode} --data-dir "${dataDir}"`,
            note: 'Use panguard_status to check current guard state after starting.',
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Execute panguard_guard_stop — stop the real-time threat monitoring daemon.
 * 執行 panguard_guard_stop — 停止即時威脅監控常駐程式。
 */
export async function executeGuardStop(args: Record<string, unknown>) {
  const dataDir = resolveDataDir(args);
  const pidFile = path.join(dataDir, 'guard.pid');

  let pid: number | null = null;
  let stopped = false;

  try {
    const pidContent = await fs.readFile(pidFile, 'utf-8');
    pid = parseInt(pidContent.trim(), 10);

    if (!isNaN(pid)) {
      try {
        process.kill(pid, 'SIGTERM');
        stopped = true;
        // Remove stale PID file
        await fs.unlink(pidFile).catch(() => undefined);
      } catch {
        // Process not running — clean up stale PID file
        await fs.unlink(pidFile).catch(() => undefined);
        stopped = false;
      }
    }
  } catch {
    // No PID file found
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            status: stopped ? 'stopped' : 'not_running',
            pid,
            message: stopped
              ? `Guard engine (PID: ${pid}) has been sent SIGTERM.`
              : 'Guard engine was not running (no PID file found).',
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Execute panguard_status — get current status of all Panguard services.
 * 執行 panguard_status — 取得所有 Panguard 服務的當前狀態。
 */
export async function executeStatus(args: Record<string, unknown>) {
  const dataDir = resolveDataDir(args);
  const pidFile = path.join(dataDir, 'guard.pid');

  let isRunning = false;
  let pid: number | null = null;

  try {
    const pidContent = await fs.readFile(pidFile, 'utf-8');
    pid = parseInt(pidContent.trim(), 10);
    if (!isNaN(pid)) {
      // Sending signal 0 checks if process exists without killing it
      process.kill(pid, 0);
      isRunning = true;
    }
  } catch {
    isRunning = false;
  }

  // Try to read guard config
  let config: Record<string, unknown> = {};
  try {
    const configPath = path.join(dataDir, 'config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(configContent) as Record<string, unknown>;
  } catch {
    // No config file yet
  }

  // Count recent events as a proxy for threat activity
  let eventCount = 0;
  try {
    const eventsFile = path.join(dataDir, 'events.jsonl');
    const content = await fs.readFile(eventsFile, 'utf-8');
    eventCount = content.trim().split('\n').filter(Boolean).length;
  } catch {
    // No events file
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            guard: {
              running: isRunning,
              pid,
              dataDir,
              mode: config['mode'] ?? 'unknown',
              lang: config['lang'] ?? 'en',
            },
            events: {
              total_logged: eventCount,
            },
            summary: isRunning
              ? `Panguard Guard is RUNNING (PID: ${pid}, mode: ${config['mode'] ?? 'unknown'}).`
              : 'Panguard Guard is NOT running. Use panguard_guard_start to start it.',
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Execute panguard_alerts — get recent security alerts from guard event log.
 * 執行 panguard_alerts — 從守護事件日誌取得近期安全告警。
 */
export async function executeAlerts(args: Record<string, unknown>) {
  const limit = (args['limit'] as number) ?? 20;
  const severity = (args['severity'] as string) ?? 'all';
  const dataDir = resolveDataDir(args);

  const eventsFile = path.join(dataDir, 'events.jsonl');
  const alerts: unknown[] = [];

  try {
    const content = await fs.readFile(eventsFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as Record<string, unknown>;
        if (severity === 'all' || event['severity'] === severity) {
          alerts.push(event);
        }
      } catch {
        // Skip malformed JSONL lines
      }
    }
  } catch {
    // No events file yet — guard may not have started
  }

  // Return the most recent `limit` alerts
  const recentAlerts = alerts.slice(-Math.max(1, limit));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            total_alerts: recentAlerts.length,
            filter: { severity, limit },
            alerts: recentAlerts,
            summary:
              recentAlerts.length === 0
                ? 'No recent alerts. System appears clean.'
                : `${recentAlerts.length} recent alert(s) detected.`,
          },
          null,
          2,
        ),
      },
    ],
  };
}
