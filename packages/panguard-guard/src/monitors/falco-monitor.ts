/**
 * FalcoMonitor - eBPF-based kernel-level syscall monitoring via Falco
 * FalcoMonitor - 透過 Falco 實作的 eBPF kernel-level syscall 監控
 *
 * Integrates with the CNCF Falco project to provide kernel-level
 * visibility into system calls. Gracefully degrades when Falco
 * is not installed (same pattern as optional LLM providers).
 *
 * @module @panguard-ai/panguard-guard/monitors/falco-monitor
 */

import { EventEmitter } from 'node:events';
import { createReadStream, existsSync, watchFile, unwatchFile, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { execFile } from 'node:child_process';
import { createLogger } from '@panguard-ai/core';
import type { SecurityEvent, Severity } from '@panguard-ai/core';

const logger = createLogger('panguard-guard:falco-monitor');

/** Default Falco alert file paths (ordered by preference) */
const FALCO_ALERT_PATHS = [
  '/var/log/falco/alerts.json',
  '/var/log/falco/events.json',
  '/etc/falco/alerts.json',
] as const;

/**
 * Raw Falco JSON alert structure
 */
export interface FalcoAlert {
  priority: string;
  rule: string;
  time: string;
  output: string;
  output_fields?: Record<string, unknown>;
  source?: string;
  tags?: string[];
  hostname?: string;
}

/**
 * Map Falco priority to Panguard severity
 */
function mapFalcoPriority(priority: string): Severity {
  const p = priority.toUpperCase();
  if (p === 'CRITICAL' || p === 'EMERGENCY' || p === 'ALERT') return 'critical';
  if (p === 'ERROR') return 'high';
  if (p === 'WARNING') return 'medium';
  if (p === 'NOTICE') return 'low';
  return 'info';
}

/**
 * Map Falco tags to MITRE ATT&CK categories
 */
function mapFalcoCategory(tags?: string[]): string {
  if (!tags || tags.length === 0) return 'unknown';

  const tagStr = tags.join(' ').toLowerCase();
  if (tagStr.includes('container') || tagStr.includes('escape')) return 'container_escape';
  if (tagStr.includes('shell') || tagStr.includes('terminal')) return 'reverse_shell';
  if (tagStr.includes('crypto') || tagStr.includes('mining')) return 'cryptomining';
  if (tagStr.includes('credential') || tagStr.includes('shadow')) return 'credential_access';
  if (tagStr.includes('network') || tagStr.includes('connect')) return 'network_activity';
  if (tagStr.includes('file') || tagStr.includes('write') || tagStr.includes('read'))
    return 'file_access';
  if (tagStr.includes('process') || tagStr.includes('exec')) return 'process_execution';

  return tags[0] ?? 'unknown';
}

let eventCounter = 0;

/**
 * Parse a raw Falco JSON alert into a Panguard SecurityEvent
 */
export function parseFalcoEvent(raw: FalcoAlert): SecurityEvent {
  eventCounter++;
  const fields = raw.output_fields ?? {};

  return {
    id: `falco-${Date.now()}-${eventCounter}`,
    timestamp: raw.time ? new Date(raw.time) : new Date(),
    source: 'falco',
    severity: mapFalcoPriority(raw.priority),
    category: mapFalcoCategory(raw.tags),
    description: raw.output || `Falco rule triggered: ${raw.rule}`,
    raw,
    host: raw.hostname ?? (raw.output_fields?.['hostname'] as string) ?? 'unknown',
    metadata: {
      rule: raw.rule,
      priority: raw.priority,
      hostname: raw.hostname,
      tags: raw.tags,
      pid: fields['proc.pid'] as number | undefined,
      processName: fields['proc.name'] as string | undefined,
      userName: fields['user.name'] as string | undefined,
      containerName: fields['container.name'] as string | undefined,
      containerId: fields['container.id'] as string | undefined,
      filePath: fields['fd.name'] as string | undefined,
      sourceIP: fields['fd.sip'] as string | undefined,
      destIP: fields['fd.dip'] as string | undefined,
    },
  };
}

/**
 * FalcoMonitor watches Falco alert output and emits SecurityEvents
 *
 * Usage:
 *   const monitor = new FalcoMonitor();
 *   if (await monitor.checkAvailability()) {
 *     monitor.on('event', (event) => processEvent(event));
 *     await monitor.start();
 *   }
 */
export class FalcoMonitor extends EventEmitter {
  private alertPath: string | null = null;
  private running = false;
  private fileOffset = 0;
  private watchInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Check if Falco is installed and alert files are accessible
   */
  async checkAvailability(): Promise<boolean> {
    // Check if falco binary exists
    const hasBinary = await new Promise<boolean>((resolve) => {
      execFile('which', ['falco'], (error) => {
        resolve(!error);
      });
    });

    if (hasBinary) {
      logger.info('Falco binary detected');
    }

    // Check for alert file
    for (const path of FALCO_ALERT_PATHS) {
      if (existsSync(path)) {
        this.alertPath = path;
        logger.info(`Falco alert file found: ${path}`);
        return true;
      }
    }

    // Allow custom path via env
    const customPath = process.env['FALCO_ALERTS_PATH'];
    if (customPath && existsSync(customPath)) {
      this.alertPath = customPath;
      logger.info(`Falco alert file (custom): ${customPath}`);
      return true;
    }

    if (hasBinary) {
      logger.warn(
        'Falco binary found but no alert file. Ensure Falco is running with json_output=true'
      );
      return false;
    }

    logger.info('Falco not detected, kernel-level monitoring disabled (optional)');
    return false;
  }

  /**
   * Start tailing the Falco alert file
   */
  async start(): Promise<void> {
    if (!this.alertPath) {
      throw new Error('Falco alert file not found. Call checkAvailability() first.');
    }

    if (this.running) return;
    this.running = true;

    // Start from end of file (only read new alerts)
    try {
      const stats = statSync(this.alertPath);
      this.fileOffset = stats.size;
    } catch {
      this.fileOffset = 0;
    }

    logger.info(`FalcoMonitor started, tailing ${this.alertPath}`);

    // Use polling-based file watch for compatibility
    const alertPath = this.alertPath;
    watchFile(alertPath, { interval: 1000 }, () => {
      this.readNewLines(alertPath);
    });
  }

  /**
   * Read new lines from the alert file since last offset
   */
  private readNewLines(filePath: string): void {
    try {
      const stats = statSync(filePath);
      if (stats.size <= this.fileOffset) {
        // File was truncated or unchanged
        if (stats.size < this.fileOffset) {
          this.fileOffset = 0;
        }
        return;
      }

      const stream = createReadStream(filePath, {
        start: this.fileOffset,
        encoding: 'utf-8',
      });
      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      rl.on('line', (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        try {
          const alert = JSON.parse(trimmed) as FalcoAlert;
          if (alert.rule && alert.priority) {
            const event = parseFalcoEvent(alert);
            this.emit('event', event);
          }
        } catch {
          // Skip non-JSON lines
        }
      });

      rl.on('close', () => {
        this.fileOffset = stats.size;
      });
    } catch (err: unknown) {
      logger.error(
        `Error reading Falco alerts: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.alertPath) {
      unwatchFile(this.alertPath);
    }
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }

    logger.info('FalcoMonitor stopped');
  }
}
