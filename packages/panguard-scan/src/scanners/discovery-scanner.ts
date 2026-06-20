/**
 * Discovery scanner - orchestrates all core discovery functions
 * 偵察掃描器 - 編排所有核心偵察功能
 *
 * Calls all discovery functions from @panguard-ai/core sequentially to build
 * a complete DiscoveryResult representing the current system's security posture.
 * 依序呼叫 @panguard-ai/core 中的所有偵察功能，建構代表目前系統安全態勢的完整 DiscoveryResult。
 *
 * @module @panguard-ai/panguard-scan/scanners/discovery-scanner
 */

import { execFileSync } from 'node:child_process';
import {
  detectOS,
  getNetworkInterfaces,
  scanOpenPorts,
  getActiveConnections,
  getGateway,
  getDnsServersAsync,
  detectServices,
  detectSecurityTools,
  checkFirewall,
  auditUsers,
  calculateRiskScore,
  createLogger,
  type DiscoveryResult,
  type DiscoveryConfig,
} from '@panguard-ai/core';

const logger = createLogger('panguard-scan:discovery');

/**
 * Run a fixed binary with a fixed args array and return trimmed stdout, or
 * null on failure. Uses execFileSync (no shell) so arguments are never
 * interpreted by a command interpreter.
 *
 * @param bin - Absolute path to the binary / 二進位檔絕對路徑
 * @param args - Argument vector (never shell-interpreted) / 參數陣列（不經 shell）
 * @param timeoutMs - Hard timeout in milliseconds / 逾時毫秒數
 */
function runCommand(bin: string, args: readonly string[], timeoutMs: number): string | null {
  try {
    return execFileSync(bin, [...args], {
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch (err) {
    // Some tools exit non-zero on success-with-results (e.g. `yum check-update`
    // returns 100 when updates exist). execFileSync throws but still attaches
    // captured stdout, so recover it rather than discarding usable output.
    const stdout = (err as { stdout?: Buffer | string } | null)?.stdout;
    if (stdout != null) {
      const text = stdout.toString().trim();
      if (text.length > 0) return text;
    }
    return null;
  }
}

/**
 * Detect pending system updates based on platform.
 * Returns { pendingUpdates, autoUpdateEnabled }.
 */
function detectUpdateStatus(): { pendingUpdates: number; autoUpdateEnabled: boolean } {
  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS: check Software Update (stderr merged into the captured text by
      // softwareupdate itself; we no longer rely on a shell 2>&1 redirect).
      const output = runCommand('/usr/sbin/softwareupdate', ['-l'], 10000) ?? '';
      const matches = output.match(/\* /g);
      const pending = matches ? matches.length : 0;
      // Check if auto-update is enabled
      const autoOutput = runCommand(
        '/usr/bin/defaults',
        ['read', '/Library/Preferences/com.apple.SoftwareUpdate', 'AutomaticCheckEnabled'],
        5000
      );
      const autoEnabled = autoOutput === '1';
      return { pendingUpdates: pending, autoUpdateEnabled: autoEnabled };
    }

    if (platform === 'linux') {
      // Try apt (Debian/Ubuntu)
      const aptOutput = runCommand('/usr/bin/apt', ['list', '--upgradable'], 10000);
      if (aptOutput !== null) {
        // Replaces shell `grep -c upgradable`: count lines mentioning upgradable.
        const count = aptOutput.split('\n').filter((line) => line.includes('upgradable')).length;
        const autoStatus = runCommand(
          '/usr/bin/systemctl',
          ['is-enabled', 'unattended-upgrades'],
          5000
        );
        return { pendingUpdates: count, autoUpdateEnabled: autoStatus === 'enabled' };
      }

      // Try yum/dnf (RHEL/CentOS/Fedora)
      const yumOutput = runCommand('/usr/bin/yum', ['check-update'], 10000);
      if (yumOutput !== null) {
        // Replaces shell `tail -n +3 | wc -l`: skip the 2-line header, then
        // count remaining non-empty package lines.
        const lines = yumOutput.split('\n');
        const count = lines.slice(2).filter((line) => line.trim().length > 0).length;
        return { pendingUpdates: count, autoUpdateEnabled: false };
      }
    }

    // Fallback: unknown
    return { pendingUpdates: 0, autoUpdateEnabled: false };
  } catch (err) {
    logger.warn('Failed to detect update status', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { pendingUpdates: 0, autoUpdateEnabled: false };
  }
}

/**
 * Run a complete environment discovery scan
 * 執行完整的環境偵察掃描
 *
 * Orchestrates all core discovery functions sequentially to avoid overloading
 * system commands. In 'quick' mode, active connections are skipped.
 * 依序編排所有核心偵察功能以避免系統命令過載。在 'quick' 模式下，會跳過活躍連線偵測。
 *
 * @param config - Discovery configuration / 偵察配置
 * @returns Complete discovery result / 完整偵察結果
 */
export async function discover(config: DiscoveryConfig): Promise<DiscoveryResult> {
  logger.info('Starting environment discovery', { depth: config.depth, lang: config.lang });

  // Step 1: Detect operating system
  // 步驟 1：偵測作業系統
  logger.info('Detecting operating system');
  const os = await detectOS();

  // Step 2: Get network interfaces
  // 步驟 2：取得網路介面
  logger.info('Enumerating network interfaces');
  const interfaces = getNetworkInterfaces();

  // Step 3: Scan open ports
  // 步驟 3：掃描開放埠
  logger.info('Scanning open ports');
  const openPorts = await scanOpenPorts();

  // Step 4: Get active connections (skip in quick mode)
  // 步驟 4：取得活躍連線（快速模式下跳過）
  let activeConnections: Awaited<ReturnType<typeof getActiveConnections>> = [];
  if (config.depth === 'full') {
    logger.info('Getting active connections');
    activeConnections = await getActiveConnections();
  } else {
    logger.info('Skipping active connections in quick mode');
  }

  // Step 5: Get gateway
  // 步驟 5：取得閘道
  logger.info('Detecting default gateway');
  const gateway = await getGateway();

  // Step 6: Get DNS servers
  // 步驟 6：取得 DNS 伺服器
  logger.info('Detecting DNS servers');
  const dns = await getDnsServersAsync();

  // Step 7: Detect running services
  // 步驟 7：偵測執行中服務
  logger.info('Detecting running services');
  const services = await detectServices();

  // Step 8: Detect security tools
  // 步驟 8：偵測安全工具
  logger.info('Detecting security tools');
  const existingTools = await detectSecurityTools(services);

  // Step 9: Check firewall status
  // 步驟 9：檢查防火牆狀態
  logger.info('Checking firewall status');
  const firewall = await checkFirewall();

  // Step 10: Audit user accounts
  // 步驟 10：稽核使用者帳號
  logger.info('Auditing user accounts');
  const users = await auditUsers();

  // Step 10b: Detect system update status
  // 步驟 10b：偵測系統更新狀態
  logger.info('Detecting system update status');
  const updates = detectUpdateStatus();

  // Assemble partial result for risk scoring
  // 組裝部分結果用於風險評分
  const partialResult: Partial<DiscoveryResult> = {
    os,
    hostname: os.hostname,
    network: {
      interfaces,
      openPorts,
      activeConnections,
      gateway,
      dns,
    },
    openPorts,
    services,
    security: {
      existingTools,
      firewall,
      updates,
      users,
    },
  };

  // Step 11: Calculate risk score
  // 步驟 11：計算風險評分
  logger.info('Calculating risk score');
  const { riskScore, factors } = calculateRiskScore(partialResult);

  // Assemble complete DiscoveryResult
  // 組裝完整 DiscoveryResult
  const result: DiscoveryResult = {
    os,
    hostname: os.hostname,
    network: {
      interfaces,
      openPorts,
      activeConnections,
      gateway,
      dns,
    },
    openPorts,
    services,
    security: {
      existingTools,
      firewall,
      updates,
      users,
    },
    vulnerabilities: factors,
    riskScore,
    discoveredAt: new Date().toISOString(),
  };

  logger.info('Discovery complete', {
    riskScore,
    factorsCount: factors.length,
    portsCount: openPorts.length,
    servicesCount: services.length,
    usersCount: users.length,
  });

  return result;
}
