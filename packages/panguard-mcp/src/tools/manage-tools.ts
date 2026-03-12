/**
 * Panguard MCP - Management Tools
 * Panguard MCP - 管理工具
 *
 * Implements panguard_init, panguard_deploy, panguard_block_ip,
 * and panguard_generate_report MCP tools.
 * 實作 panguard_init、panguard_deploy、panguard_block_ip 和 panguard_generate_report MCP 工具。
 *
 * @module @panguard-ai/panguard-mcp/tools/manage-tools
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runScan, generatePdfReport } from '@panguard-ai/panguard-scan';
import { createLogger } from '@panguard-ai/core';

const logger = createLogger('panguard-mcp:manage');

/** IPv4 validation regex */
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
/** IPv6 validation regex — accepts compressed and full forms */
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;

/** Directories that are safe for Panguard to write into. */
const SAFE_BASES = [
  os.homedir(),
  os.tmpdir(),
  process.cwd(),
  // macOS: /tmp is a symlink to /private/tmp, distinct from os.tmpdir()
  '/tmp',
  '/private/tmp',
];

/**
 * Assert that a resolved path stays within an allowed base directory.
 * Prevents path traversal attacks from MCP tool arguments.
 */
function assertSafePath(resolved: string): void {
  const normalResolved = path.resolve(resolved);
  const isAllowed = SAFE_BASES.some((base) => {
    const normalBase = path.resolve(base);
    return normalResolved === normalBase || normalResolved.startsWith(normalBase + path.sep);
  });
  if (!isAllowed) {
    throw new Error(`Path traversal rejected: ${resolved} is outside allowed directories`);
  }
}

/**
 * Resolve the guard data directory from args or default.
 * 從參數或預設值解析守護資料目錄。
 */
function resolveDataDir(args: Record<string, unknown>): string {
  const dataDir = (args['dataDir'] as string) ?? path.join(os.homedir(), '.panguard-guard');
  const resolved = path.resolve(dataDir);
  assertSafePath(resolved);
  return resolved;
}

/**
 * Execute panguard_block_ip — manually block an IP address.
 * 執行 panguard_block_ip — 手動封鎖 IP 位址。
 */
export async function executeBlockIP(args: Record<string, unknown>) {
  const ip = args['ip'] as string | undefined;
  const duration = (args['duration'] as string) ?? '1h';
  const reason = (args['reason'] as string) ?? 'Manually blocked via Panguard MCP';

  if (!ip) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: 'IP address is required' }),
        },
      ],
      isError: true,
    };
  }

  if (!IPV4_REGEX.test(ip) && !IPV6_REGEX.test(ip)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: `Invalid IP address format: ${ip}` }),
        },
      ],
      isError: true,
    };
  }

  logger.info(`Blocking IP: ${ip} for ${duration} — Reason: ${reason}`);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            status: 'blocked',
            ip,
            duration,
            reason,
            timestamp: new Date().toISOString(),
            message: `IP ${ip} has been queued for blocking for ${duration}.`,
            note: 'Ensure Panguard Guard is running for the block to take effect.',
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Execute panguard_generate_report — run scan and generate a PDF compliance report.
 * 執行 panguard_generate_report — 執行掃描並生成 PDF 合規報告。
 */
export async function executeGenerateReport(args: Record<string, unknown>) {
  const output = (args['output'] as string) ?? './panguard-report.pdf';
  const lang = ((args['lang'] as string) ?? 'en') as 'en' | 'zh-TW';
  const depth = ((args['depth'] as string) ?? 'full') as 'quick' | 'full';

  try {
    const resolvedOutput = path.resolve(output);
    assertSafePath(resolvedOutput);
    const result = await runScan({ depth, lang });
    await generatePdfReport(result, resolvedOutput, lang);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              status: 'generated',
              output: path.resolve(output),
              risk_score: result.riskScore,
              grade: scoreToGrade(result.riskScore),
              findings_count: result.findings.length,
              message: `PDF report generated at ${path.resolve(output)}`,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}

/**
 * Execute panguard_init — initialize Panguard configuration with defaults.
 * 執行 panguard_init — 以預設值初始化 Panguard 配置。
 */
export async function executeInit(args: Record<string, unknown>) {
  const dataDir = resolveDataDir(args);
  const lang = (args['lang'] as string) ?? 'en';
  const mode = (args['mode'] as string) ?? 'learning';

  await fs.mkdir(dataDir, { recursive: true });

  const config = {
    lang,
    mode,
    learningDays: 14,
    dataDir,
    dashboardEnabled: false,
    dashboardPort: 4443,
    verbose: false,
    watchdogEnabled: true,
    watchdogInterval: 30000,
    monitors: {
      logMonitor: true,
      networkMonitor: true,
      processMonitor: true,
      fileMonitor: false,
      networkPollInterval: 5000,
      processPollInterval: 5000,
    },
    actionPolicy: { autoRespond: 85, notifyAndWait: 50, logOnly: 0 },
    notifications: {},
  };

  const configPath = path.join(dataDir, 'config.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            status: 'initialized',
            dataDir,
            configPath,
            mode,
            lang,
            message: `Panguard initialized at ${dataDir}. Use panguard_deploy to start all services.`,
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Execute panguard_deploy — one-click setup: init + scan + optional report.
 * 執行 panguard_deploy — 一鍵設定：初始化 + 掃描 + 可選報告。
 */
export async function executeDeploy(args: Record<string, unknown>) {
  const dataDir = resolveDataDir(args);
  const lang = ((args['lang'] as string) ?? 'en') as 'en' | 'zh-TW';
  const mode = (args['mode'] as string) ?? 'learning';
  const generateReport = (args['generateReport'] as boolean) ?? true;

  // Step 1: Initialize data directory and config
  await fs.mkdir(dataDir, { recursive: true });
  const config = {
    lang,
    mode,
    learningDays: 14,
    dataDir,
    dashboardEnabled: false,
    dashboardPort: 4443,
    verbose: false,
    watchdogEnabled: true,
    watchdogInterval: 30000,
    monitors: {
      logMonitor: true,
      networkMonitor: true,
      processMonitor: true,
      fileMonitor: false,
      networkPollInterval: 5000,
      processPollInterval: 5000,
    },
    actionPolicy: { autoRespond: 85, notifyAndWait: 50, logOnly: 0 },
    notifications: {},
  };
  const configPath = path.join(dataDir, 'config.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  // Step 2: Run quick scan
  let scanResult: Awaited<ReturnType<typeof runScan>> | null = null;
  try {
    scanResult = await runScan({ depth: 'quick', lang });
  } catch (err: unknown) {
    logger.warn('Scan failed during deploy: ' + (err instanceof Error ? err.message : String(err)));
  }

  // Step 3: Generate initial report if requested
  let reportPath: string | null = null;
  if (generateReport && scanResult) {
    try {
      reportPath = path.join(dataDir, 'initial-report.pdf');
      await generatePdfReport(scanResult, reportPath, lang);
    } catch (err: unknown) {
      logger.warn(
        'Report generation failed: ' + (err instanceof Error ? err.message : String(err)),
      );
      reportPath = null;
    }
  }

  const criticalHighCount = scanResult
    ? scanResult.findings.filter((f) => f.severity === 'critical' || f.severity === 'high').length
    : 0;

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            status: 'deployed',
            steps: [
              { step: 'init', status: 'complete', dataDir, configPath },
              {
                step: 'scan',
                status: scanResult ? 'complete' : 'failed',
                risk_score: scanResult?.riskScore ?? null,
                findings: scanResult?.findings.length ?? null,
              },
              {
                step: 'report',
                status: reportPath ? 'complete' : generateReport ? 'failed' : 'skipped',
                path: reportPath,
              },
              {
                step: 'guard',
                status: 'ready',
                note: 'Use panguard_guard_start to start real-time monitoring',
              },
            ],
            summary: scanResult
              ? `Deployment complete! Risk score: ${scanResult.riskScore}/100. ${scanResult.findings.length} issues found.${reportPath ? ` Report: ${reportPath}` : ''}`
              : 'Partial deployment. Scan failed but guard is ready to start.',
            next_steps: [
              'Run panguard_guard_start to begin real-time threat monitoring',
              criticalHighCount > 0
                ? `Fix ${criticalHighCount} critical/high findings before switching to protection mode`
                : 'System looks good! Consider switching mode to protection when ready.',
            ],
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Convert a numeric risk score (0-100) to a letter grade (A-F).
 * 將數字風險分數（0-100）轉換為字母等級（A-F）。
 */
function scoreToGrade(score: number): string {
  const safety = 100 - score;
  if (safety >= 90) return 'A';
  if (safety >= 75) return 'B';
  if (safety >= 60) return 'C';
  if (safety >= 40) return 'D';
  return 'F';
}
