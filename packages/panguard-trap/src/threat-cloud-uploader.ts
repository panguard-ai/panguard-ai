/**
 * Threat Cloud Uploader for PanguardTrap
 * PanguardTrap 的 Threat Cloud 上傳器
 *
 * Batches and uploads TrapIntelligence reports to the Threat Cloud server.
 * Supports offline queueing and automatic retry.
 *
 * 批次上傳 TrapIntelligence 報告至 Threat Cloud 伺服器。
 * 支援離線排隊和自動重試。
 *
 * @module @panguard-ai/panguard-trap/threat-cloud-uploader
 */

import { createHash } from 'node:crypto';

import { createLogger } from '@panguard-ai/core';
import type { TrapIntelligence } from './types.js';

const logger = createLogger('panguard-trap:cloud-uploader');

/**
 * Validate that an upload endpoint is safe (HTTPS + not a private/reserved host).
 * Prevents SSRF: trap intel must only ever leave to the real Threat Cloud,
 * never to a loopback/private/link-local/reserved address an attacker could
 * coerce via a poisoned config.
 * 驗證上傳端點安全（HTTPS + 非私有/保留位址），防止 SSRF。
 *
 * @throws Error when the scheme is not https or the host is a private/reserved IP.
 */
function assertSafeEndpoint(endpoint: string): void {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error(`Invalid Threat Cloud endpoint: ${endpoint}`);
  }

  if (url.protocol !== 'https:') {
    throw new Error(`Threat Cloud endpoint must use https, got: ${url.protocol}`);
  }

  if (isPrivateOrReservedHost(url.hostname)) {
    throw new Error(`Threat Cloud endpoint host is private or reserved: ${url.hostname}`);
  }
}

/**
 * True when a hostname is a loopback, private, link-local, or otherwise
 * reserved address that the uploader must never POST to.
 */
function isPrivateOrReservedHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();

  if (host === 'localhost' || host.endsWith('.localhost')) return true;

  // IPv6 loopback / unspecified / unique-local (fc00::/7) / link-local (fe80::/10)
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true;
    if (host.startsWith('fc') || host.startsWith('fd')) return true;
    if (host.startsWith('fe8') || host.startsWith('fe9') || host.startsWith('fea') || host.startsWith('feb')) {
      return true;
    }
    return false;
  }

  // IPv4 dotted-quad ranges
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  if ([a, b, c, d].some((o) => o > 255)) return true; // malformed -> reject
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false;
}

/** Serializable form of TrapIntelligence for HTTP POST */
interface TrapIntelPayload {
  timestamp: string;
  serviceType: string;
  sourceIP: string;
  attackType: string;
  mitreTechniques: string[];
  skillLevel: string;
  intent: string;
  tools: string[];
  topCredentials: Array<{ username: string; count: number }>;
  region?: string;
}

/**
 * Uploads TrapIntelligence to the Threat Cloud server in batches.
 * 批次上傳蜜罐情報至 Threat Cloud。
 */
export class ThreatCloudUploader {
  private readonly endpoint: string;
  private buffer: TrapIntelPayload[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  /** Max items before immediate flush / 觸發立即上傳的最大數量 */
  private static readonly BATCH_SIZE = 20;
  /** Max buffer size to prevent memory growth / 防止記憶體膨脹的上限 */
  private static readonly MAX_BUFFER = 500;
  /** Periodic flush interval (ms) / 定期上傳間隔 */
  private static readonly FLUSH_INTERVAL = 30_000;

  constructor(endpoint: string) {
    const normalized = endpoint.replace(/\/+$/, '');
    assertSafeEndpoint(normalized);
    this.endpoint = normalized;

    this.flushTimer = setInterval(() => {
      void this.flush();
    }, ThreatCloudUploader.FLUSH_INTERVAL);

    // Allow Node process to exit if this is the only timer
    if (this.flushTimer.unref) this.flushTimer.unref();
  }

  /**
   * Queue a TrapIntelligence report for upload.
   * 將蜜罐情報加入上傳佇列。
   */
  enqueue(intel: TrapIntelligence): void {
    const payload = this.toPayload(intel);
    this.buffer.push(payload);

    // Cap buffer
    if (this.buffer.length > ThreatCloudUploader.MAX_BUFFER) {
      this.buffer = this.buffer.slice(-ThreatCloudUploader.MAX_BUFFER);
    }

    // Flush immediately if batch size reached
    if (this.buffer.length >= ThreatCloudUploader.BATCH_SIZE) {
      void this.flush();
    }
  }

  /**
   * Flush all buffered intel to the server.
   * 上傳所有緩衝中的情報。
   */
  async flush(): Promise<number> {
    if (this.buffer.length === 0) return 0;

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      const url = `${this.endpoint}/api/trap-intel`;
      const payload = JSON.stringify(batch);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        // Refuse redirects: a redirect could re-point the upload at a
        // private/internal host that bypassed the constructor's check.
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      logger.info(
        `Uploaded ${batch.length} trap intel reports to Threat Cloud / ` +
          `已上傳 ${batch.length} 筆蜜罐情報`
      );
      return batch.length;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Trap intel upload failed: ${msg} / 上傳失敗: ${msg}`);

      // Re-buffer failed batch (at front so ordering is preserved)
      this.buffer.unshift(...batch);
      if (this.buffer.length > ThreatCloudUploader.MAX_BUFFER) {
        this.buffer = this.buffer.slice(-ThreatCloudUploader.MAX_BUFFER);
      }
      return 0;
    }
  }

  /**
   * Stop the periodic flush timer.
   * 停止定期上傳計時器。
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** Get pending buffer size / 取得待上傳數量 */
  getPendingCount(): number {
    return this.buffer.length;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  /**
   * Anonymize an IP address by zeroing the last two segments.
   * 匿名化 IP 位址：將末兩段歸零。
   *
   * IPv4: 192.168.1.100 -> 192.168.0.0
   * IPv6: 2001:db8:85a3::8a2e:370:7334 -> 2001:db8:85a3::8a2e:0:0
   */
  private anonymizeIP(ip: string): string {
    if (ip.includes('.')) {
      // IPv4
      const parts = ip.split('.');
      if (parts.length === 4) {
        parts[2] = '0';
        parts[3] = '0';
        return parts.join('.');
      }
    } else if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      if (parts.length >= 2) {
        parts[parts.length - 1] = '0';
        parts[parts.length - 2] = '0';
        return parts.join(':');
      }
    }
    return ip;
  }

  /**
   * Hash a username with SHA-256, truncated to 16 hex characters.
   * 以 SHA-256 雜湊使用者名稱，截取前 16 個十六進位字元。
   */
  private hashUsername(username: string): string {
    return createHash('sha256').update(username).digest('hex').slice(0, 16);
  }

  private toPayload(intel: TrapIntelligence): TrapIntelPayload {
    return {
      timestamp: intel.timestamp.toISOString(),
      serviceType: intel.serviceType,
      sourceIP: this.anonymizeIP(intel.sourceIP),
      attackType: intel.attackType,
      mitreTechniques: [...intel.mitreTechniques],
      skillLevel: intel.skillLevel,
      intent: intel.intent,
      tools: [...intel.tools],
      topCredentials: intel.topCredentials.map((c) => ({
        username: this.hashUsername(c.username),
        count: c.count,
      })),
      region: intel.region,
    };
  }
}
