/**
 * Network connection monitoring via polling
 * 透過輪詢進行網路連線監控
 *
 * Periodically polls active network connections and emits events
 * for newly established or closed connections.
 * 定期輪詢活躍網路連線，並為新建立或關閉的連線發出事件。
 *
 * @module @panguard-ai/core/monitor/network-monitor
 */

import { EventEmitter } from 'node:events';
import { execFile } from 'node:child_process';
import { platform } from 'node:os';
import { promisify } from 'node:util';

import { createLogger } from '../utils/index.js';
import { normalizeNetworkEvent } from './event-normalizer.js';
import type { ActiveConnection } from '../discovery/types.js';

const execFileAsync = promisify(execFile);
const logger = createLogger('network-monitor');

/**
 * Generate a unique key for a connection to track state changes
 * 為連線產生唯一金鑰以追蹤狀態變更
 *
 * @param conn - Active connection / 活躍連線
 * @returns Connection key string / 連線金鑰字串
 */
function connectionKey(conn: ActiveConnection): string {
  return `${conn.localAddress}:${conn.localPort}-${conn.remoteAddress}:${conn.remotePort}`;
}

/**
 * NetworkMonitor - monitors active network connections by polling OS tools
 * NetworkMonitor - 透過輪詢作業系統工具監控活躍網路連線
 *
 * Events emitted:
 * - 'new_connection': SecurityEvent - when a new connection is detected / 當偵測到新連線時
 * - 'closed_connection': SecurityEvent - when a connection is closed / 當連線關閉時
 * - 'error': Error - when polling encounters an error / 當輪詢遇到錯誤時
 *
 * @example
 * ```typescript
 * const monitor = new NetworkMonitor(30000);
 * monitor.on('new_connection', (event) => console.log('New:', event));
 * monitor.on('closed_connection', (event) => console.log('Closed:', event));
 * monitor.start();
 * ```
 */
export class NetworkMonitor extends EventEmitter {
  /** Whether the monitor is currently running / 監控器是否正在執行 */
  private running = false;
  /** Polling timer / 輪詢計時器 */
  private timer?: ReturnType<typeof setInterval>;
  /** Previous connection snapshot for diff detection / 用於差異偵測的先前連線快照 */
  private previousConnections: Map<string, ActiveConnection> = new Map();
  /** Polling interval in milliseconds / 輪詢間隔（毫秒） */
  private pollInterval: number;

  /**
   * Create a new NetworkMonitor instance
   * 建立新的 NetworkMonitor 實例
   *
   * @param pollInterval - Polling interval in ms (default 30000) / 輪詢間隔毫秒數（預設 30000）
   */
  constructor(pollInterval = 30000) {
    super();
    this.pollInterval = pollInterval;
  }

  /**
   * Start polling for network connections
   * 開始輪詢網路連線
   */
  start(): void {
    if (this.running) {
      logger.warn('NetworkMonitor is already running');
      return;
    }

    this.running = true;
    logger.info(`NetworkMonitor started (poll interval: ${this.pollInterval}ms)`);

    // Run an initial poll immediately / 立即執行首次輪詢
    void this.pollConnections();

    this.timer = setInterval(() => {
      void this.pollConnections();
    }, this.pollInterval);
  }

  /**
   * Stop polling and clean up
   * 停止輪詢並清理
   */
  stop(): void {
    if (!this.running) {
      logger.warn('NetworkMonitor is not running');
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    this.running = false;
    this.previousConnections.clear();
    logger.info('NetworkMonitor stopped');
  }

  /**
   * Check if the monitor is currently running
   * 檢查監控器是否正在執行
   *
   * @returns True if running / 如果正在執行則為 true
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Poll current connections and emit events for changes
   * 輪詢目前連線並為變更發出事件
   */
  private async pollConnections(): Promise<void> {
    try {
      const currentList = await this.getCurrentConnections();
      const currentMap = new Map<string, ActiveConnection>();

      for (const conn of currentList) {
        const key = connectionKey(conn);
        currentMap.set(key, conn);

        // Emit event for new connections not in previous snapshot
        // 為不在先前快照中的新連線發出事件
        if (!this.previousConnections.has(key)) {
          const event = normalizeNetworkEvent({
            localAddr: conn.localAddress,
            localPort: conn.localPort,
            remoteAddr: conn.remoteAddress,
            remotePort: conn.remotePort,
            state: conn.state,
            process: conn.process || undefined,
          });
          this.emit('new_connection', event);
        }
      }

      // Emit event for connections that no longer exist
      // 為不再存在的連線發出事件
      for (const [key, conn] of this.previousConnections) {
        if (!currentMap.has(key)) {
          const event = normalizeNetworkEvent({
            localAddr: conn.localAddress,
            localPort: conn.localPort,
            remoteAddr: conn.remoteAddress,
            remotePort: conn.remotePort,
            state: 'CLOSED',
            process: conn.process || undefined,
          });
          this.emit('closed_connection', event);
        }
      }

      this.previousConnections = currentMap;
    } catch (err) {
      logger.error('Failed to poll connections', { error: String(err) });
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Get current active network connections from the OS
   * 從作業系統取得目前活躍的網路連線
   *
   * Uses platform-specific tools:
   * 使用平台特定工具：
   * - macOS: `lsof -i -P -n`
   * - Linux: `ss -tnp`
   * - Windows: `netstat -an`
   *
   * @returns Array of active connections / 活躍連線陣列
   */
  async getCurrentConnections(): Promise<ActiveConnection[]> {
    const os = platform();

    try {
      if (os === 'darwin') {
        return await this.parseLsof();
      } else if (os === 'linux') {
        return await this.parseSs();
      } else if (os === 'win32') {
        return await this.parseNetstat();
      } else {
        logger.warn(`Unsupported platform for network monitoring: ${os}`);
        return [];
      }
    } catch (err) {
      logger.error('Failed to get current connections', { error: String(err) });
      return [];
    }
  }

  /**
   * Parse macOS lsof output into ActiveConnection array
   * 將 macOS lsof 輸出解析為 ActiveConnection 陣列
   *
   * @returns Parsed connections / 解析後的連線
   */
  private async parseLsof(): Promise<ActiveConnection[]> {
    const { stdout } = await execFileAsync('lsof', ['-i', '-P', '-n'], {
      timeout: 10000,
    });

    const connections: ActiveConnection[] = [];
    const lines = stdout.split('\n');

    // Skip header line / 跳過標頭行
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim().length === 0) continue;

      // lsof output columns: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
      const parts = line.split(/\s+/);
      if (parts.length < 9) continue;

      const processName = parts[0] ?? '';
      const pid = parseInt(parts[1] ?? '', 10);
      const name = parts[parts.length - 1] ?? '';

      // Parse connection string like "192.168.1.1:443->10.0.0.1:12345"
      // 解析連線字串如 "192.168.1.1:443->10.0.0.1:12345"
      const arrowMatch = name.match(/^(.+):(\d+)->(.+):(\d+)$/);
      if (arrowMatch) {
        connections.push({
          localAddress: arrowMatch[1] ?? '',
          localPort: parseInt(arrowMatch[2] ?? '0', 10),
          remoteAddress: arrowMatch[3] ?? '',
          remotePort: parseInt(arrowMatch[4] ?? '0', 10),
          state: 'ESTABLISHED',
          process: processName,
          pid: isNaN(pid) ? undefined : pid,
        });
        continue;
      }

      // Parse listening socket like "*:8080" or "127.0.0.1:3000"
      // 解析監聽 socket 如 "*:8080" 或 "127.0.0.1:3000"
      const listenMatch = name.match(/^(.+):(\d+)$/);
      if (listenMatch) {
        const stateCol = parts[parts.length - 2];
        connections.push({
          localAddress: listenMatch[1] ?? '',
          localPort: parseInt(listenMatch[2] ?? '0', 10),
          remoteAddress: '',
          remotePort: 0,
          state: stateCol === '(LISTEN)' ? 'LISTEN' : 'UNKNOWN',
          process: processName,
          pid: isNaN(pid) ? undefined : pid,
        });
      }
    }

    return connections;
  }

  /**
   * Parse Linux ss output into ActiveConnection array
   * 將 Linux ss 輸出解析為 ActiveConnection 陣列
   *
   * @returns Parsed connections / 解析後的連線
   */
  private async parseSs(): Promise<ActiveConnection[]> {
    const { stdout } = await execFileAsync('ss', ['-tnp'], {
      timeout: 10000,
    });

    const connections: ActiveConnection[] = [];
    const lines = stdout.split('\n');

    // Skip header line / 跳過標頭行
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim().length === 0) continue;

      // ss output: State Recv-Q Send-Q Local Address:Port Peer Address:Port Process
      const parts = line.split(/\s+/);
      if (parts.length < 5) continue;

      const state = parts[0] ?? '';
      const localParts = (parts[3] ?? '').split(':');
      const remoteParts = (parts[4] ?? '').split(':');

      const localAddr = localParts.slice(0, -1).join(':') || '0.0.0.0';
      const localPort = parseInt(localParts[localParts.length - 1] ?? '0', 10);
      const remoteAddr = remoteParts.slice(0, -1).join(':') || '0.0.0.0';
      const remotePort = parseInt(remoteParts[remoteParts.length - 1] ?? '0', 10);

      // Extract process name from the "users:(("name",pid=PID,...))" field
      // 從 "users:(("name",pid=PID,...))" 欄位中擷取程序名稱
      let processName = '';
      let pid: number | undefined;
      const processField = parts[5] ?? '';
      const processMatch = processField.match(/\(\("(.+?)",pid=(\d+)/);
      if (processMatch) {
        processName = processMatch[1] ?? '';
        pid = parseInt(processMatch[2] ?? '0', 10);
      }

      connections.push({
        localAddress: localAddr,
        localPort,
        remoteAddress: remoteAddr,
        remotePort,
        state: state.toUpperCase(),
        process: processName,
        pid: pid !== undefined && !isNaN(pid) ? pid : undefined,
      });
    }

    return connections;
  }

  /**
   * Parse Windows netstat output into ActiveConnection array
   * 將 Windows netstat 輸出解析為 ActiveConnection 陣列
   *
   * @returns Parsed connections / 解析後的連線
   */
  private async parseNetstat(): Promise<ActiveConnection[]> {
    const { stdout } = await execFileAsync('netstat', ['-an'], {
      timeout: 10000,
    });

    const connections: ActiveConnection[] = [];
    const lines = stdout.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || (!trimmed.startsWith('TCP') && !trimmed.startsWith('UDP'))) continue;

      // netstat -an output: Proto Local Address Foreign Address State
      const parts = trimmed.split(/\s+/);
      if (parts.length < 4) continue;

      const localParts = (parts[1] ?? '').split(':');
      const remoteParts = (parts[2] ?? '').split(':');
      const state = parts[3] ?? '';

      const localAddr = localParts.slice(0, -1).join(':') || '0.0.0.0';
      const localPort = parseInt(localParts[localParts.length - 1] ?? '0', 10);
      const remoteAddr = remoteParts.slice(0, -1).join(':') || '0.0.0.0';
      const remotePort = parseInt(remoteParts[remoteParts.length - 1] ?? '0', 10);

      connections.push({
        localAddress: localAddr,
        localPort,
        remoteAddress: remoteAddr,
        remotePort,
        state: state.toUpperCase() || 'UNKNOWN',
        process: '',
        pid: undefined,
      });
    }

    return connections;
  }
}
