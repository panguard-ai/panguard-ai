/**
 * LogCollector - Tails log files, receives syslog, and converts entries to SecurityEvents
 * LogCollector - 追蹤日誌檔案、接收 syslog，並將條目轉換為 SecurityEvent
 *
 * Collects log data from multiple sources:
 * - File tailing (e.g., /var/log/auth.log, /var/log/syslog)
 * - Syslog UDP listener (RFC 3164 / 5424)
 * - Syslog TCP listener
 * - Journald polling (Linux only, via journalctl)
 *
 * 從多個來源收集日誌資料：
 * - 檔案追蹤（如 /var/log/auth.log、/var/log/syslog）
 * - Syslog UDP 監聽器（RFC 3164 / 5424）
 * - Syslog TCP 監聽器
 * - Journald 輪詢（僅限 Linux，透過 journalctl）
 *
 * @module @panguard-ai/panguard-guard/collectors/log-collector
 */

import { EventEmitter } from 'node:events';
import { createReadStream, existsSync, statSync, watchFile, unwatchFile } from 'node:fs';
import { createInterface } from 'node:readline';
import { createSocket, type Socket as DgramSocket } from 'node:dgram';
import { createServer, type Server as NetServer } from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { createLogger } from '@panguard-ai/core';
import type { SecurityEvent, EventSource } from '@panguard-ai/core';
import { parseLogLine } from './log-parsers.js';

const logger = createLogger('panguard-guard:log-collector');

/**
 * Configuration for the LogCollector / LogCollector 配置
 */
export interface LogCollectorConfig {
  /** File paths to tail (e.g., /var/log/auth.log) / 要追蹤的檔案路徑 */
  filePaths?: string[];
  /** Enable syslog UDP listener / 啟用 syslog UDP 監聽器 */
  syslogUdp?: { port: number; host?: string };
  /** Enable syslog TCP listener / 啟用 syslog TCP 監聽器 */
  syslogTcp?: { port: number; host?: string };
  /** Enable journald polling (Linux only) / 啟用 journald 輪詢（僅限 Linux） */
  journald?: { unit?: string; pollIntervalMs?: number };
}

/**
 * Tracked state for a single tailed file / 單一追蹤檔案的狀態
 */
interface TailedFile {
  path: string;
  offset: number;
}

/**
 * LogCollector watches log files, listens for syslog, and emits SecurityEvents
 * LogCollector 監視日誌檔案、監聽 syslog，並發出 SecurityEvent
 *
 * Usage:
 *   const collector = new LogCollector({ filePaths: ['/var/log/auth.log'] });
 *   collector.on('event', (event) => processEvent(event));
 *   collector.start();
 *   // later...
 *   collector.stop();
 *
 * Emits: 'event' with SecurityEvent payload
 */
export class LogCollector extends EventEmitter {
  private readonly config: LogCollectorConfig;
  private running = false;

  // File tail state / 檔案追蹤狀態
  private readonly tailedFiles: TailedFile[] = [];

  // Syslog listeners / Syslog 監聽器
  private udpSocket: DgramSocket | null = null;
  private tcpServer: NetServer | null = null;

  // Journald process / Journald 程序
  private journaldProcess: ChildProcess | null = null;
  private journaldTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: LogCollectorConfig) {
    super();
    this.config = config;
  }

  /**
   * Start all configured log collection sources / 啟動所有已配置的日誌收集來源
   */
  start(): void {
    if (this.running) {
      logger.warn('LogCollector already running / LogCollector 已在執行中');
      return;
    }

    this.running = true;
    logger.info('LogCollector starting / LogCollector 啟動中');

    // Start file tailers / 啟動檔案追蹤器
    if (this.config.filePaths && this.config.filePaths.length > 0) {
      this.startFileTails(this.config.filePaths);
    }

    // Start syslog UDP listener / 啟動 syslog UDP 監聽器
    if (this.config.syslogUdp) {
      this.startSyslogUdp(this.config.syslogUdp.port, this.config.syslogUdp.host);
    }

    // Start syslog TCP listener / 啟動 syslog TCP 監聽器
    if (this.config.syslogTcp) {
      this.startSyslogTcp(this.config.syslogTcp.port, this.config.syslogTcp.host);
    }

    // Start journald polling / 啟動 journald 輪詢
    if (this.config.journald) {
      this.startJournald(this.config.journald.unit, this.config.journald.pollIntervalMs);
    }

    logger.info('LogCollector started / LogCollector 已啟動');
  }

  /**
   * Stop all log collection sources / 停止所有日誌收集來源
   */
  stop(): void {
    if (!this.running) return;

    logger.info('LogCollector stopping / LogCollector 停止中');
    this.running = false;

    // Stop file watchers / 停止檔案監視器
    for (const tailed of this.tailedFiles) {
      try {
        unwatchFile(tailed.path);
      } catch {
        // File may already be unwatched / 檔案可能已經取消監視
      }
    }
    this.tailedFiles.length = 0;

    // Stop syslog UDP / 停止 syslog UDP
    if (this.udpSocket) {
      try {
        this.udpSocket.close();
      } catch {
        // Socket may already be closed / Socket 可能已關閉
      }
      this.udpSocket = null;
    }

    // Stop syslog TCP / 停止 syslog TCP
    if (this.tcpServer) {
      try {
        this.tcpServer.close();
      } catch {
        // Server may already be closed / Server 可能已關閉
      }
      this.tcpServer = null;
    }

    // Stop journald / 停止 journald
    if (this.journaldProcess) {
      this.journaldProcess.kill();
      this.journaldProcess = null;
    }
    if (this.journaldTimer) {
      clearInterval(this.journaldTimer);
      this.journaldTimer = null;
    }

    logger.info('LogCollector stopped / LogCollector 已停止');
  }

  /**
   * Process a raw log line: parse and emit as SecurityEvent
   * 處理原始日誌行：解析並作為 SecurityEvent 發出
   */
  private processLine(line: string, sourceHint?: EventSource): void {
    if (!line || !this.running) return;

    const trimmed = line.trim();
    if (trimmed.length === 0) return;

    try {
      const parsed = parseLogLine(trimmed);
      if (!parsed) return;

      // Build a complete SecurityEvent from the partial parse result
      // 從部分解析結果建構完整的 SecurityEvent
      const event: SecurityEvent = {
        id: parsed.id ?? `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: parsed.timestamp ?? new Date(),
        source: parsed.source ?? sourceHint ?? 'syslog',
        severity: parsed.severity ?? 'info',
        category: parsed.category ?? 'system',
        description: parsed.description ?? trimmed,
        raw: parsed.raw ?? trimmed,
        host: parsed.host ?? 'unknown',
        metadata: parsed.metadata ?? {},
      };

      this.emit('event', event);
    } catch (err: unknown) {
      logger.debug(`Failed to parse log line: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ===== File Tailing / 檔案追蹤 =====

  /**
   * Start tailing multiple log files / 啟動追蹤多個日誌檔案
   */
  private startFileTails(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.startFileTail(filePath);
    }
  }

  /**
   * Start tailing a single log file / 啟動追蹤單一日誌檔案
   *
   * Uses fs.watchFile (polling) for broad compatibility.
   * Handles log rotation by detecting file truncation.
   * 使用 fs.watchFile（輪詢）以獲得廣泛相容性。
   * 透過偵測檔案截斷來處理日誌輪替。
   */
  private startFileTail(filePath: string): void {
    if (!existsSync(filePath)) {
      logger.warn(`Log file not found, skipping: ${filePath} / 日誌檔案不存在，跳過: ${filePath}`);
      return;
    }

    // Start from end of file (only read new lines)
    // 從檔案末尾開始（只讀取新行）
    let offset = 0;
    try {
      const stats = statSync(filePath);
      offset = stats.size;
    } catch {
      offset = 0;
    }

    const tailed: TailedFile = { path: filePath, offset };
    this.tailedFiles.push(tailed);

    logger.info(`Tailing log file: ${filePath} / 追蹤日誌檔案: ${filePath}`);

    watchFile(filePath, { interval: 1000 }, () => {
      if (!this.running) return;
      this.readNewLines(tailed);
    });
  }

  /**
   * Read new lines from a tailed file since the last known offset
   * 從追蹤的檔案中讀取自上次已知偏移量以來的新行
   */
  private readNewLines(tailed: TailedFile): void {
    try {
      if (!existsSync(tailed.path)) {
        // File was deleted (log rotation) - reset offset
        // 檔案被刪除（日誌輪替） - 重設偏移量
        tailed.offset = 0;
        return;
      }

      const stats = statSync(tailed.path);

      // File truncated (log rotation) - reset offset
      // 檔案被截斷（日誌輪替） - 重設偏移量
      if (stats.size < tailed.offset) {
        tailed.offset = 0;
      }

      // No new data / 沒有新資料
      if (stats.size <= tailed.offset) return;

      const stream = createReadStream(tailed.path, {
        start: tailed.offset,
        encoding: 'utf-8',
      });

      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      rl.on('line', (line) => {
        this.processLine(line);
      });

      rl.on('close', () => {
        tailed.offset = stats.size;
      });

      rl.on('error', (err) => {
        logger.warn(
          `Error reading log file ${tailed.path}: ${err.message} / ` +
            `讀取日誌檔案錯誤 ${tailed.path}: ${err.message}`
        );
      });
    } catch (err: unknown) {
      logger.warn(
        `Error tailing file ${tailed.path}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ===== Syslog UDP / Syslog UDP 監聽器 =====

  /**
   * Start a syslog UDP listener / 啟動 syslog UDP 監聽器
   */
  private startSyslogUdp(port: number, host?: string): void {
    try {
      this.udpSocket = createSocket('udp4');

      this.udpSocket.on('message', (msg) => {
        if (!this.running) return;
        const line = msg.toString('utf-8');
        this.processLine(line, 'syslog');
      });

      this.udpSocket.on('error', (err) => {
        logger.error(`Syslog UDP error: ${err.message} / Syslog UDP 錯誤: ${err.message}`);
      });

      const bindHost = host ?? '0.0.0.0';
      this.udpSocket.bind(port, bindHost, () => {
        logger.info(
          `Syslog UDP listening on ${bindHost}:${port} / Syslog UDP 監聽於 ${bindHost}:${port}`
        );
      });
    } catch (err: unknown) {
      logger.error(
        `Failed to start syslog UDP: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ===== Syslog TCP / Syslog TCP 監聽器 =====

  /**
   * Start a syslog TCP listener / 啟動 syslog TCP 監聽器
   */
  private startSyslogTcp(port: number, host?: string): void {
    try {
      this.tcpServer = createServer((socket) => {
        const rl = createInterface({ input: socket, crlfDelay: Infinity });

        rl.on('line', (line) => {
          if (!this.running) return;
          this.processLine(line, 'syslog');
        });

        socket.on('error', (err) => {
          logger.debug(`Syslog TCP client error: ${err.message}`);
        });
      });

      this.tcpServer.on('error', (err) => {
        logger.error(
          `Syslog TCP server error: ${err.message} / Syslog TCP 伺服器錯誤: ${err.message}`
        );
      });

      const bindHost = host ?? '0.0.0.0';
      this.tcpServer.listen(port, bindHost, () => {
        logger.info(
          `Syslog TCP listening on ${bindHost}:${port} / Syslog TCP 監聽於 ${bindHost}:${port}`
        );
      });
    } catch (err: unknown) {
      logger.error(
        `Failed to start syslog TCP: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ===== Journald / Journald 輪詢 =====

  /**
   * Start journald log collection via journalctl / 透過 journalctl 啟動 journald 日誌收集
   *
   * Uses `journalctl --follow --output=json` for streaming mode.
   * Falls back to poll-based approach if streaming fails.
   * Only works on Linux systems with systemd.
   *
   * 使用 `journalctl --follow --output=json` 進行串流模式。
   * 串流失敗時退回到輪詢方式。
   * 僅適用於有 systemd 的 Linux 系統。
   */
  private startJournald(unit?: string, pollIntervalMs?: number): void {
    // Only attempt on Linux / 僅在 Linux 上嘗試
    if (process.platform !== 'linux') {
      logger.info(
        'Journald collection skipped (non-Linux platform) / ' +
          'Journald 收集已跳過（非 Linux 平台）'
      );
      return;
    }

    const args = ['--follow', '--output=json', '--no-pager'];
    if (unit) {
      args.push(`--unit=${unit}`);
    }
    // Only show new entries from now / 只顯示從現在開始的新條目
    args.push('--since=now');

    try {
      this.journaldProcess = spawn('journalctl', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      if (this.journaldProcess.stdout) {
        const rl = createInterface({
          input: this.journaldProcess.stdout,
          crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
          if (!this.running) return;
          this.processJournaldLine(line);
        });
      }

      this.journaldProcess.on('error', (err) => {
        logger.warn(`Journald process error: ${err.message} / Journald 程序錯誤: ${err.message}`);
        // Fall back to polling / 退回到輪詢
        this.journaldProcess = null;
        this.startJournaldPolling(unit, pollIntervalMs ?? 5000);
      });

      this.journaldProcess.on('exit', (code) => {
        if (this.running && code !== 0) {
          logger.warn(`Journalctl exited with code ${code}, falling back to polling`);
          this.journaldProcess = null;
          this.startJournaldPolling(unit, pollIntervalMs ?? 5000);
        }
      });

      logger.info(
        `Journald streaming started${unit ? ` (unit: ${unit})` : ''} / ` +
          `Journald 串流已啟動${unit ? `（單元: ${unit}）` : ''}`
      );
    } catch {
      // journalctl not available - try polling fallback
      // journalctl 不可用 - 嘗試輪詢退回
      this.startJournaldPolling(unit, pollIntervalMs ?? 5000);
    }
  }

  /**
   * Poll-based fallback for journald / Journald 的輪詢退回方案
   */
  private startJournaldPolling(unit?: string, intervalMs: number = 5000): void {
    let lastTimestamp = new Date().toISOString();

    this.journaldTimer = setInterval(() => {
      if (!this.running) return;

      const args = ['--output=json', '--no-pager', `--since=${lastTimestamp}`];
      if (unit) {
        args.push(`--unit=${unit}`);
      }

      const proc = spawn('journalctl', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      if (proc.stdout) {
        const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });
        rl.on('line', (line) => {
          this.processJournaldLine(line);
        });
      }

      proc.on('error', () => {
        // journalctl not available on this system / 此系統上 journalctl 不可用
      });

      lastTimestamp = new Date().toISOString();
    }, intervalMs);
  }

  /**
   * Process a single journald JSON line / 處理單一 journald JSON 行
   */
  private processJournaldLine(line: string): void {
    try {
      const entry = JSON.parse(line) as Record<string, string>;
      const message = entry['MESSAGE'] ?? '';
      const hostname = entry['_HOSTNAME'] ?? 'unknown';
      const program = entry['SYSLOG_IDENTIFIER'] ?? entry['_COMM'] ?? '';
      const pid = entry['_PID'] ?? entry['SYSLOG_PID'] ?? '';
      const priorityStr = entry['PRIORITY'] ?? '6';

      // Reconstruct a syslog-like line for the parser
      // 重建類似 syslog 的行給解析器使用
      const now = new Date();
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const month = monthNames[now.getMonth()];
      const day = String(now.getDate()).padStart(2, ' ');
      const time = now.toTimeString().split(' ')[0];
      const pidPart = pid ? `[${pid}]` : '';
      const priority = parseInt(priorityStr, 10);
      // Map journald priority (0-7) to syslog priority (facility * 8 + severity)
      // Use facility 1 (user) for journald entries
      const syslogPriority = 1 * 8 + priority;

      const reconstructed = `<${syslogPriority}>${month} ${day} ${time} ${hostname} ${program}${pidPart}: ${message}`;

      this.processLine(reconstructed, 'journald');
    } catch {
      // Invalid JSON line from journald - skip / 無效的 journald JSON 行 - 跳過
    }
  }
}
