/**
 * RootkitDetector - Linux rootkit detection monitor
 * RootkitDetector - Linux Rootkit 偵測監控器
 *
 * Detects hidden processes, LD_PRELOAD hooking, suspicious kernel modules,
 * hidden files, and system binary integrity violations.
 * 偵測隱藏程序、LD_PRELOAD 劫持、可疑核心模組、隱藏檔案及系統二進位檔完整性問題。
 *
 * Gracefully degrades on non-Linux platforms (returns false from checkAvailability).
 * 在非 Linux 平台上會優雅降級（checkAvailability 回傳 false）。
 *
 * @module @panguard-ai/panguard-guard/monitors/rootkit-detector
 */

import { EventEmitter } from 'node:events';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createLogger } from '@panguard-ai/core';
import type { SecurityEvent, Severity } from '@panguard-ai/core';

const logger = createLogger('panguard-guard:rootkit-detector');

const execFileAsync = promisify(execFile);

/** Default scan interval in milliseconds (60 seconds) / 預設掃描間隔（60 秒） */
const DEFAULT_SCAN_INTERVAL_MS = 60_000;

/** Sensitive directories to check for hidden files / 敏感目錄（用於隱藏檔案偵測） */
const SENSITIVE_DIRECTORIES = ['/etc', '/usr/bin', '/usr/sbin'] as const;

/**
 * Critical system binaries and their expected SHA256 checksums.
 * In production, these would be populated from a known-good baseline.
 * 關鍵系統二進位檔及其預期 SHA256 校驗值。
 * 生產環境中，這些值會從已知良好基線填入。
 */
const CRITICAL_BINARIES = [
  '/bin/ps',
  '/bin/ls',
  '/bin/netstat',
  '/usr/bin/find',
  '/usr/bin/top',
  '/bin/login',
  '/usr/sbin/sshd',
  '/bin/su',
] as const;

/**
 * Known suspicious kernel module names commonly associated with rootkits.
 * 常見與 rootkit 相關的可疑核心模組名稱。
 */
const SUSPICIOUS_MODULE_NAMES = [
  'diamorphine',
  'reptile',
  'suterusu',
  'knark',
  'adore-ng',
  'rkkit',
  'enyelkm',
  'override',
  'hide_module',
  'rootkit',
] as const;

let eventCounter = 0;

/**
 * Result from a single rootkit check / 單次 rootkit 檢查結果
 */
export interface RootkitFinding {
  /** Check type / 檢查類型 */
  readonly checkType:
    | 'hidden_process'
    | 'ld_preload'
    | 'kernel_module'
    | 'hidden_file'
    | 'binary_integrity';
  /** Severity level / 嚴重等級 */
  readonly severity: Severity;
  /** Human-readable description / 人類可讀描述 */
  readonly description: string;
  /** Detailed evidence / 詳細證據 */
  readonly details: Record<string, unknown>;
}

/**
 * Create a SecurityEvent from a rootkit finding / 從 rootkit 發現建立安全事件
 */
export function createRootkitEvent(finding: RootkitFinding): SecurityEvent {
  eventCounter++;

  return {
    id: `rootkit-${Date.now()}-${eventCounter}`,
    timestamp: new Date(),
    source: 'process',
    severity: finding.severity,
    category: mapCheckTypeToCategory(finding.checkType),
    description: finding.description,
    raw: { ...finding },
    host: getHostname(),
    metadata: {
      checkType: finding.checkType,
      ...finding.details,
    },
  };
}

/**
 * Map rootkit check type to MITRE ATT&CK category / 將 rootkit 檢查類型映射到 MITRE ATT&CK 分類
 */
function mapCheckTypeToCategory(checkType: RootkitFinding['checkType']): string {
  switch (checkType) {
    case 'hidden_process':
      return 'defense_evasion';
    case 'ld_preload':
      return 'persistence';
    case 'kernel_module':
      return 'persistence';
    case 'hidden_file':
      return 'defense_evasion';
    case 'binary_integrity':
      return 'defense_evasion';
  }
}

/**
 * Get the hostname, with fallback / 取得主機名稱（含備用值）
 */
function getHostname(): string {
  try {
    return readFileSync('/etc/hostname', 'utf-8').trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Parse PIDs from /proc by reading directory entries / 從 /proc 目錄讀取 PID
 */
export function getPidsFromProc(): readonly number[] {
  try {
    const entries = readdirSync('/proc');
    return entries
      .filter((entry) => /^\d+$/.test(entry))
      .map((entry) => parseInt(entry, 10))
      .filter((pid) => !isNaN(pid));
  } catch {
    return [];
  }
}

/**
 * Parse PIDs from `ps` command output / 從 ps 指令輸出解析 PID
 */
export async function getPidsFromPs(): Promise<readonly number[]> {
  try {
    const { stdout } = await execFileAsync('/bin/ps', ['-eo', 'pid', '--no-headers']);
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => parseInt(line, 10))
      .filter((pid) => !isNaN(pid));
  } catch {
    return [];
  }
}

/**
 * Detect hidden processes by comparing /proc enumeration vs ps output.
 * Processes visible in /proc but NOT in ps may be hidden by a rootkit.
 * 偵測隱藏程序：比較 /proc 列舉與 ps 輸出。
 * 出現在 /proc 但不在 ps 中的程序可能被 rootkit 隱藏。
 */
export async function detectHiddenProcesses(): Promise<readonly RootkitFinding[]> {
  const procPids = getPidsFromProc();
  const psPids = await getPidsFromPs();

  if (procPids.length === 0 || psPids.length === 0) {
    logger.debug('Unable to enumerate PIDs for hidden process check');
    return [];
  }

  const psSet = new Set(psPids);

  // PIDs in /proc but not in ps output — potentially hidden
  // 在 /proc 中但不在 ps 輸出中的 PID — 可能被隱藏
  const hiddenPids = procPids.filter((pid) => !psSet.has(pid));

  return hiddenPids.map(
    (pid): RootkitFinding => ({
      checkType: 'hidden_process',
      severity: 'critical',
      description: `Hidden process detected: PID ${pid} visible in /proc but not in ps output`,
      details: {
        pid,
        procVisible: true,
        psVisible: false,
      },
    })
  );
}

/**
 * Check for LD_PRELOAD hooking — a common rootkit persistence technique.
 * Inspects both the LD_PRELOAD environment variable and /etc/ld.so.preload.
 * 檢查 LD_PRELOAD 劫持 — 常見的 rootkit 持久化技術。
 * 同時檢查 LD_PRELOAD 環境變數和 /etc/ld.so.preload。
 */
export function checkLdPreload(): readonly RootkitFinding[] {
  const findings: RootkitFinding[] = [];

  // Check LD_PRELOAD environment variable / 檢查 LD_PRELOAD 環境變數
  const ldPreloadEnv = process.env['LD_PRELOAD'];
  if (ldPreloadEnv && ldPreloadEnv.trim().length > 0) {
    findings.push({
      checkType: 'ld_preload',
      severity: 'high',
      description: `LD_PRELOAD environment variable is set: ${ldPreloadEnv}`,
      details: {
        source: 'environment',
        value: ldPreloadEnv,
        libraries: ldPreloadEnv.split(':').filter((lib) => lib.trim().length > 0),
      },
    });
  }

  // Check /etc/ld.so.preload file / 檢查 /etc/ld.so.preload 檔案
  try {
    if (existsSync('/etc/ld.so.preload')) {
      const content = readFileSync('/etc/ld.so.preload', 'utf-8').trim();
      if (content.length > 0) {
        const libraries = content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith('#'));

        if (libraries.length > 0) {
          findings.push({
            checkType: 'ld_preload',
            severity: 'high',
            description: `/etc/ld.so.preload contains ${libraries.length} preloaded library(ies)`,
            details: {
              source: '/etc/ld.so.preload',
              libraries,
              rawContent: content,
            },
          });
        }
      }
    }
  } catch (err: unknown) {
    logger.debug(
      `Cannot read /etc/ld.so.preload: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return findings;
}

/**
 * Parse kernel modules from /proc/modules / 從 /proc/modules 解析核心模組
 */
export function getModulesFromProc(): readonly string[] {
  try {
    const content = readFileSync('/proc/modules', 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Module name is the first field / 模組名稱是第一個欄位
        const parts = line.split(/\s+/);
        return parts[0] ?? '';
      })
      .filter((name) => name.length > 0);
  } catch {
    return [];
  }
}

/**
 * Parse kernel modules from lsmod output / 從 lsmod 輸出解析核心模組
 */
export async function getModulesFromLsmod(): Promise<readonly string[]> {
  try {
    const { stdout } = await execFileAsync('/sbin/lsmod', []);
    return stdout
      .split('\n')
      .slice(1) // Skip header line / 跳過標題行
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(/\s+/);
        return parts[0] ?? '';
      })
      .filter((name) => name.length > 0);
  } catch {
    return [];
  }
}

/**
 * Check kernel modules for suspicious entries and discrepancies.
 * Compares /proc/modules with lsmod output and checks for known rootkit modules.
 * 檢查核心模組是否有可疑項目或差異。
 * 比較 /proc/modules 與 lsmod 輸出，並檢查已知 rootkit 模組。
 */
export async function checkKernelModules(): Promise<readonly RootkitFinding[]> {
  const findings: RootkitFinding[] = [];

  const procModules = getModulesFromProc();
  const lsmodModules = await getModulesFromLsmod();

  // Check for modules in /proc but not in lsmod (hidden from lsmod)
  // 檢查在 /proc 中但不在 lsmod 中的模組（從 lsmod 隱藏）
  if (procModules.length > 0 && lsmodModules.length > 0) {
    const lsmodSet = new Set(lsmodModules);
    const hiddenModules = procModules.filter((mod) => !lsmodSet.has(mod));

    for (const mod of hiddenModules) {
      findings.push({
        checkType: 'kernel_module',
        severity: 'critical',
        description: `Kernel module "${mod}" visible in /proc/modules but not in lsmod output`,
        details: {
          moduleName: mod,
          procVisible: true,
          lsmodVisible: false,
        },
      });
    }
  }

  // Check for known suspicious module names / 檢查已知可疑模組名稱
  const allModules = [...new Set([...procModules, ...lsmodModules])];
  const suspiciousModuleSet = new Set(SUSPICIOUS_MODULE_NAMES as readonly string[]);

  for (const mod of allModules) {
    const modLower = mod.toLowerCase();
    if (suspiciousModuleSet.has(modLower)) {
      findings.push({
        checkType: 'kernel_module',
        severity: 'critical',
        description: `Suspicious kernel module detected: "${mod}" (known rootkit module)`,
        details: {
          moduleName: mod,
          reason: 'known_rootkit_module',
        },
      });
    }
  }

  return findings;
}

/**
 * Detect hidden files by comparing readdir (libc) vs getdents (direct syscall).
 * On Linux, differences may indicate userspace rootkit hooking readdir.
 * We approximate this by comparing readdirSync with ls output.
 * 偵測隱藏檔案：比較 readdir（libc）與 getdents（直接系統呼叫）。
 * 差異可能表示使用者空間 rootkit 劫持了 readdir。
 * 我們透過比較 readdirSync 與 ls 輸出來近似此檢查。
 */
export async function detectHiddenFiles(
  directories?: readonly string[]
): Promise<readonly RootkitFinding[]> {
  const findings: RootkitFinding[] = [];
  const dirsToCheck = directories ?? SENSITIVE_DIRECTORIES;

  for (const dir of dirsToCheck) {
    if (!existsSync(dir)) continue;

    try {
      // Get files via readdirSync (uses libc readdir) / 透過 readdirSync 取得檔案（使用 libc readdir）
      const readdirFiles = readdirSync(dir);

      // Get files via ls command (uses getdents syscall) / 透過 ls 指令取得檔案（使用 getdents 系統呼叫）
      let lsFiles: readonly string[];
      try {
        const { stdout } = await execFileAsync('/bin/ls', ['-1a', dir]);
        lsFiles = stdout
          .split('\n')
          .map((f) => f.trim())
          .filter((f) => f.length > 0 && f !== '.' && f !== '..');
      } catch {
        continue;
      }

      // Files visible to ls (getdents) but not to readdir may indicate rootkit hiding
      // ls 可見但 readdir 不可見的檔案可能表示 rootkit 隱藏
      const readdirSet = new Set(readdirFiles);
      const hiddenFromReaddir = lsFiles.filter((f) => !readdirSet.has(f));

      for (const file of hiddenFromReaddir) {
        findings.push({
          checkType: 'hidden_file',
          severity: 'high',
          description: `Hidden file detected in ${dir}: "${file}" visible via ls but not readdir`,
          details: {
            directory: dir,
            fileName: file,
            lsVisible: true,
            readdirVisible: false,
          },
        });
      }

      // Also check reverse: readdir sees it but ls doesn't
      // 反向檢查：readdir 可見但 ls 不可見
      const lsSet = new Set(lsFiles);
      const hiddenFromLs = readdirFiles.filter((f) => !lsSet.has(f));

      for (const file of hiddenFromLs) {
        findings.push({
          checkType: 'hidden_file',
          severity: 'high',
          description: `Hidden file detected in ${dir}: "${file}" visible via readdir but not ls`,
          details: {
            directory: dir,
            fileName: file,
            lsVisible: false,
            readdirVisible: true,
          },
        });
      }
    } catch (err: unknown) {
      logger.debug(
        `Error checking directory ${dir}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return findings;
}

/**
 * Check integrity of critical system binaries using SHA256 checksums.
 * Compares current checksums against known-good values (if provided).
 * 使用 SHA256 校驗值檢查關鍵系統二進位檔的完整性。
 * 將當前校驗值與已知良好值比較（若有提供）。
 */
export async function checkBinaryIntegrity(
  knownChecksums?: ReadonlyMap<string, string>
): Promise<readonly RootkitFinding[]> {
  const findings: RootkitFinding[] = [];

  for (const binary of CRITICAL_BINARIES) {
    if (!existsSync(binary)) continue;

    try {
      const { stdout } = await execFileAsync('/usr/bin/sha256sum', [binary]);
      const currentChecksum = stdout.split(/\s+/)[0] ?? '';

      if (knownChecksums && knownChecksums.has(binary)) {
        const expectedChecksum = knownChecksums.get(binary)!;
        if (currentChecksum !== expectedChecksum) {
          findings.push({
            checkType: 'binary_integrity',
            severity: 'critical',
            description: `System binary "${binary}" checksum mismatch — possible trojanized binary`,
            details: {
              binary,
              currentChecksum,
              expectedChecksum,
              match: false,
            },
          });
        }
      }
    } catch (err: unknown) {
      logger.debug(
        `Cannot checksum ${binary}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return findings;
}

/**
 * RootkitDetector performs periodic rootkit detection scans on Linux systems.
 * RootkitDetector 在 Linux 系統上執行週期性 rootkit 偵測掃描。
 *
 * Usage:
 *   const detector = new RootkitDetector();
 *   if (await detector.checkAvailability()) {
 *     detector.on('event', (event) => processEvent(event));
 *     await detector.start();
 *   }
 */
export class RootkitDetector extends EventEmitter {
  private running = false;
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;
  private readonly knownChecksums: ReadonlyMap<string, string>;

  constructor(options?: {
    readonly intervalMs?: number;
    readonly knownChecksums?: ReadonlyMap<string, string>;
  }) {
    super();
    this.intervalMs = options?.intervalMs ?? DEFAULT_SCAN_INTERVAL_MS;
    this.knownChecksums = options?.knownChecksums ?? new Map<string, string>();
  }

  /**
   * Check if rootkit detection is available (Linux only).
   * Returns false on non-Linux platforms with a graceful info log.
   * 檢查 rootkit 偵測是否可用（僅限 Linux）。
   * 非 Linux 平台會優雅地記錄 info 日誌並回傳 false。
   */
  async checkAvailability(): Promise<boolean> {
    if (process.platform !== 'linux') {
      logger.info(`Rootkit detection not available on ${process.platform} (Linux only), skipping`);
      return false;
    }

    // Verify /proc filesystem is available / 確認 /proc 檔案系統可用
    if (!existsSync('/proc')) {
      logger.warn('/proc filesystem not available, rootkit detection disabled');
      return false;
    }

    logger.info('Rootkit detection available on Linux');
    return true;
  }

  /**
   * Start periodic rootkit scanning / 啟動週期性 rootkit 掃描
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    logger.info(`RootkitDetector started, scan interval: ${this.intervalMs}ms`);

    // Run initial scan immediately / 立即執行首次掃描
    await this.runScan();

    // Schedule periodic scans / 排程週期性掃描
    this.scanInterval = setInterval(() => {
      void this.runScan();
    }, this.intervalMs);
  }

  /**
   * Run a full rootkit detection scan / 執行完整 rootkit 偵測掃描
   */
  async runScan(): Promise<readonly RootkitFinding[]> {
    logger.debug('Running rootkit detection scan');
    const allFindings: RootkitFinding[] = [];

    try {
      // Run all checks in parallel for performance / 平行執行所有檢查以提升效能
      const [hiddenProcesses, kernelModules, hiddenFiles, binaryIntegrity] = await Promise.all([
        detectHiddenProcesses(),
        checkKernelModules(),
        detectHiddenFiles(),
        checkBinaryIntegrity(this.knownChecksums),
      ]);

      // Synchronous check / 同步檢查
      const ldPreload = checkLdPreload();

      // Aggregate all findings (immutable spread) / 彙整所有發現（不可變展開）
      allFindings.push(
        ...hiddenProcesses,
        ...ldPreload,
        ...kernelModules,
        ...hiddenFiles,
        ...binaryIntegrity
      );

      // Emit SecurityEvents for each finding / 對每個發現發出安全事件
      for (const finding of allFindings) {
        const event = createRootkitEvent(finding);
        this.emit('event', event);
      }

      if (allFindings.length === 0) {
        logger.debug('Rootkit scan complete: no findings');
      } else {
        logger.warn(`Rootkit scan complete: ${allFindings.length} finding(s) detected`);
      }
    } catch (err: unknown) {
      logger.error(
        `Error during rootkit scan: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    return allFindings;
  }

  /**
   * Stop monitoring / 停止監控
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    logger.info('RootkitDetector stopped');
  }
}
