/**
 * LogCollector unit tests / LogCollector 單元測試
 *
 * Tests for file tailing, syslog UDP reception, lifecycle, and error handling.
 * 測試檔案追蹤、syslog UDP 接收、生命週期和錯誤處理。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSocket } from 'node:dgram';
import { LogCollector } from '../src/collectors/log-collector.js';
import type { SecurityEvent } from '@panguard-ai/core';

/** Helper: wait for a condition with timeout / 等待條件滿足或逾時 */
function waitFor(
  predicate: () => boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 50
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = (): void => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`waitFor timed out after ${timeoutMs}ms`));
        return;
      }
      setTimeout(check, intervalMs);
    };
    check();
  });
}

/** Helper: create a temp directory / 建立臨時目錄 */
function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'panguard-log-test-'));
}

describe('LogCollector', () => {
  const collectors: LogCollector[] = [];

  afterEach(() => {
    // Clean up all collectors created during tests
    // 清理測試期間建立的所有收集器
    for (const c of collectors) {
      try {
        c.stop();
      } catch {
        // Ignore cleanup errors / 忽略清理錯誤
      }
    }
    collectors.length = 0;
  });

  // ===== Constructor / 建構子 =====

  describe('constructor', () => {
    it('should accept an empty config', () => {
      const collector = new LogCollector({});
      collectors.push(collector);

      expect(collector).toBeInstanceOf(LogCollector);
    });

    it('should accept a config with file paths', () => {
      const collector = new LogCollector({
        filePaths: ['/var/log/auth.log', '/var/log/syslog'],
      });
      collectors.push(collector);

      expect(collector).toBeInstanceOf(LogCollector);
    });

    it('should accept a config with all options', () => {
      const collector = new LogCollector({
        filePaths: ['/var/log/auth.log'],
        syslogUdp: { port: 10514, host: '127.0.0.1' },
        syslogTcp: { port: 10515, host: '127.0.0.1' },
        journald: { unit: 'sshd', pollIntervalMs: 3000 },
      });
      collectors.push(collector);

      expect(collector).toBeInstanceOf(LogCollector);
    });
  });

  // ===== Lifecycle / 生命週期 =====

  describe('start/stop lifecycle', () => {
    it('should start and stop without errors', () => {
      const collector = new LogCollector({});
      collectors.push(collector);

      expect(() => collector.start()).not.toThrow();
      expect(() => collector.stop()).not.toThrow();
    });

    it('should handle double start gracefully', () => {
      const collector = new LogCollector({});
      collectors.push(collector);

      collector.start();
      // Second start should not throw
      expect(() => collector.start()).not.toThrow();
      collector.stop();
    });

    it('should handle double stop gracefully', () => {
      const collector = new LogCollector({});
      collectors.push(collector);

      collector.start();
      collector.stop();
      // Second stop should not throw
      expect(() => collector.stop()).not.toThrow();
    });

    it('should handle stop without start', () => {
      const collector = new LogCollector({});
      collectors.push(collector);

      expect(() => collector.stop()).not.toThrow();
    });
  });

  // ===== File Tail / 檔案追蹤 =====

  describe('file tailing', () => {
    it('should emit SecurityEvent when new line is appended to tailed file', async () => {
      const tmpDir = makeTempDir();
      const logFile = join(tmpDir, 'test-auth.log');

      // Create initial file content / 建立初始檔案內容
      writeFileSync(logFile, '');

      const collector = new LogCollector({ filePaths: [logFile] });
      collectors.push(collector);

      const events: SecurityEvent[] = [];
      collector.on('event', (event: SecurityEvent) => {
        events.push(event);
      });

      collector.start();

      // Wait a moment for the watcher to initialize / 等待監視器初始化
      await new Promise((r) => setTimeout(r, 200));

      // Append a syslog line / 追加一行 syslog
      appendFileSync(
        logFile,
        'Mar  1 10:15:33 webserver sshd[12345]: Accepted password for deploy from 192.168.1.100 port 54321 ssh2\n'
      );

      // Wait for the event to be emitted (watchFile polls every 1000ms)
      // 等待事件發出（watchFile 每 1000ms 輪詢一次）
      await waitFor(() => events.length > 0, 6000);

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0]!.source).toBe('authlog');
      expect(events[0]!.metadata['action']).toBe('login_success');
      expect(events[0]!.metadata['user']).toBe('deploy');

      // Cleanup temp file / 清理臨時檔案
      try {
        unlinkSync(logFile);
      } catch {
        // Ignore / 忽略
      }
    });

    it('should handle nonexistent file path without crashing', () => {
      const collector = new LogCollector({
        filePaths: ['/tmp/nonexistent-panguard-test-file-12345.log'],
      });
      collectors.push(collector);

      // Should not throw when starting with nonexistent file
      // 啟動時不應因不存在的檔案而拋出錯誤
      expect(() => collector.start()).not.toThrow();
      collector.stop();
    });

    it('should handle file truncation (log rotation)', async () => {
      const tmpDir = makeTempDir();
      const logFile = join(tmpDir, 'rotating.log');

      // Create file with some initial content / 建立含有初始內容的檔案
      writeFileSync(logFile, 'Mar  1 10:00:00 host init[1]: initial line\n');

      const collector = new LogCollector({ filePaths: [logFile] });
      collectors.push(collector);

      const events: SecurityEvent[] = [];
      collector.on('event', (event: SecurityEvent) => {
        events.push(event);
      });

      collector.start();

      await new Promise((r) => setTimeout(r, 200));

      // Truncate the file (simulate log rotation) / 截斷檔案（模擬日誌輪替）
      writeFileSync(logFile, '');

      // Wait for the watcher to detect truncation / 等待監視器偵測到截斷
      await new Promise((r) => setTimeout(r, 1500));

      // Write new content after rotation / 輪替後寫入新內容
      appendFileSync(
        logFile,
        'Mar  1 10:20:00 host sshd[100]: Failed password for admin from 10.0.0.1 port 22 ssh2\n'
      );

      await waitFor(() => events.length > 0, 6000);

      // Should receive the post-rotation event / 應接收到輪替後的事件
      expect(events.length).toBeGreaterThanOrEqual(1);

      try {
        unlinkSync(logFile);
      } catch {
        // Ignore / 忽略
      }
    }, 10000);
  });

  // ===== Syslog UDP / Syslog UDP =====

  describe('syslog UDP', () => {
    it('should emit SecurityEvent when UDP syslog packet is received', async () => {
      // Use a random high port to avoid conflicts / 使用隨機高埠以避免衝突
      const port = 10514 + Math.floor(Math.random() * 1000);

      const collector = new LogCollector({
        syslogUdp: { port, host: '127.0.0.1' },
      });
      collectors.push(collector);

      const events: SecurityEvent[] = [];
      collector.on('event', (event: SecurityEvent) => {
        events.push(event);
      });

      collector.start();

      // Wait for socket to bind / 等待 socket 綁定
      await new Promise((r) => setTimeout(r, 300));

      // Send a syslog UDP packet / 發送 syslog UDP 封包
      const client = createSocket('udp4');
      const message = Buffer.from(
        '<34>Mar  1 10:30:00 remotehost sshd[999]: Failed password for test from 172.16.0.1 port 22 ssh2'
      );

      await new Promise<void>((resolve, reject) => {
        client.send(message, port, '127.0.0.1', (err) => {
          client.close();
          if (err) reject(err);
          else resolve();
        });
      });

      // Wait for the event / 等待事件
      await waitFor(() => events.length > 0, 3000);

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0]!.metadata['action']).toBe('login_failure');
      expect(events[0]!.metadata['user']).toBe('test');
    });
  });

  // ===== Multiple Sources / 多重來源 =====

  describe('multiple sources', () => {
    it('should collect events from both file and syslog UDP simultaneously', async () => {
      const tmpDir = makeTempDir();
      const logFile = join(tmpDir, 'multi-source.log');
      writeFileSync(logFile, '');

      const port = 11514 + Math.floor(Math.random() * 1000);

      const collector = new LogCollector({
        filePaths: [logFile],
        syslogUdp: { port, host: '127.0.0.1' },
      });
      collectors.push(collector);

      const events: SecurityEvent[] = [];
      collector.on('event', (event: SecurityEvent) => {
        events.push(event);
      });

      collector.start();

      await new Promise((r) => setTimeout(r, 300));

      // Send event via file / 透過檔案發送事件
      appendFileSync(
        logFile,
        'Mar  1 10:15:33 filehost sshd[1]: Accepted password for userA from 10.0.0.1 port 22 ssh2\n'
      );

      // Send event via UDP / 透過 UDP 發送事件
      const client = createSocket('udp4');
      const message = Buffer.from(
        '<34>Mar  1 10:30:00 udphost sshd[2]: Accepted password for userB from 10.0.0.2 port 22 ssh2'
      );
      await new Promise<void>((resolve, reject) => {
        client.send(message, port, '127.0.0.1', (err) => {
          client.close();
          if (err) reject(err);
          else resolve();
        });
      });

      // Wait for both events / 等待兩個事件
      await waitFor(() => events.length >= 2, 6000);

      expect(events.length).toBeGreaterThanOrEqual(2);

      const hosts = events.map((e) => e.host);
      expect(hosts).toContain('filehost');
      expect(hosts).toContain('udphost');

      try {
        unlinkSync(logFile);
      } catch {
        // Ignore / 忽略
      }
    });
  });

  // ===== Error Handling / 錯誤處理 =====

  describe('error handling', () => {
    it('should not crash when file path array contains mix of valid and invalid paths', () => {
      const tmpDir = makeTempDir();
      const validFile = join(tmpDir, 'valid.log');
      writeFileSync(validFile, '');

      const collector = new LogCollector({
        filePaths: [
          validFile,
          '/nonexistent/path/that/does/not/exist.log',
          '/another/fake/path.log',
        ],
      });
      collectors.push(collector);

      expect(() => collector.start()).not.toThrow();
      collector.stop();

      try {
        unlinkSync(validFile);
      } catch {
        // Ignore / 忽略
      }
    });

    it('should not emit events after stop is called', async () => {
      const port = 12514 + Math.floor(Math.random() * 1000);

      const collector = new LogCollector({
        syslogUdp: { port, host: '127.0.0.1' },
      });
      collectors.push(collector);

      const events: SecurityEvent[] = [];
      collector.on('event', (event: SecurityEvent) => {
        events.push(event);
      });

      collector.start();
      await new Promise((r) => setTimeout(r, 200));

      // Stop the collector / 停止收集器
      collector.stop();

      // Try to send a packet after stop / 停止後嘗試發送封包
      const client = createSocket('udp4');
      const message = Buffer.from('<34>Mar  1 10:30:00 host sshd[1]: test message');
      try {
        await new Promise<void>((resolve) => {
          client.send(message, port, '127.0.0.1', () => {
            client.close();
            resolve();
          });
        });
      } catch {
        // Expected: socket may be closed / 預期：socket 可能已關閉
      }

      // Wait a bit to see if any events come through / 等待一下看是否有事件通過
      await new Promise((r) => setTimeout(r, 300));

      expect(events.length).toBe(0);
    });
  });
});
