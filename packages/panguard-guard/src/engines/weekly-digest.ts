/**
 * Weekly Security Digest
 *
 * Aggregates local Guard stats + Threat Cloud global stats into
 * a periodic security summary. Outputs to terminal and optional webhook.
 *
 * @module @panguard-ai/panguard-guard/engines/weekly-digest
 */

import { createLogger } from '@panguard-ai/core';
import type { ThreatCloudClient } from '../threat-cloud/index.js';

const logger = createLogger('panguard-guard:weekly-digest');

/** Validated URL schemes for webhook delivery */
const ALLOWED_SCHEMES = new Set(['https:']);

/** Private/reserved IP ranges (SSRF protection) */
const PRIVATE_IP_PATTERNS = [
  /^127\./, // IPv4 loopback
  /^10\./, // RFC 1918 Class A
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC 1918 Class B
  /^192\.168\./, // RFC 1918 Class C
  /^169\.254\./, // Link-local
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT (RFC 6598)
  /^0\./, // "This" network
  /^198\.1[89]\./, // Benchmarking (RFC 2544)
  /^::1$/, // IPv6 loopback
  /^fc[0-9a-f]{2}:/i, // IPv6 ULA fc::/8
  /^fd[0-9a-f]{2}:/i, // IPv6 ULA fd::/8
  /^fe80:/i, // IPv6 link-local
  /^::ffff:/i, // IPv4-mapped IPv6
  /^localhost$/i,
];

export interface DigestConfig {
  /** Interval in ms (default: 7 days) */
  readonly intervalMs?: number;
  /** Optional webhook URL for delivery (must be https, no private IPs) */
  readonly webhookUrl?: string;
  /** Threat Cloud client for global stats */
  readonly threatCloud?: ThreatCloudClient;
}

export interface DigestData {
  readonly period: { from: string; to: string };
  readonly local: {
    readonly eventsProcessed: number;
    readonly threatsBlocked: number;
    readonly skillsAudited: number;
    readonly rulesActive: number;
  };
  readonly global: {
    readonly communityRules: number;
    readonly totalSkillThreats: number;
    readonly newRulesThisWeek: number;
  } | null;
}

/**
 * Validate a webhook URL for SSRF safety.
 * Returns null if valid, or an error message if rejected.
 */
export function validateWebhookUrl(urlStr: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return 'Invalid URL format';
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return `Scheme "${parsed.protocol}" not allowed (only https)`;
  }

  const hostname = parsed.hostname;

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return `Hostname "${hostname}" resolves to private/reserved range`;
    }
  }

  return null;
}

export class WeeklyDigest {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly config: Required<Omit<DigestConfig, 'threatCloud' | 'webhookUrl'>> & {
    threatCloud?: ThreatCloudClient;
    webhookUrl?: string;
  };

  // Counters (reset each digest period)
  private eventsProcessed = 0;
  private threatsBlocked = 0;
  private skillsAudited = 0;

  constructor(config: DigestConfig = {}) {
    this.config = {
      intervalMs: config.intervalMs ?? 7 * 24 * 60 * 60 * 1000,
      webhookUrl: config.webhookUrl,
      threatCloud: config.threatCloud,
    };

    // Validate webhook URL at construction time
    if (this.config.webhookUrl) {
      const err = validateWebhookUrl(this.config.webhookUrl);
      if (err) {
        logger.warn(`Webhook URL rejected: ${err}. Digest will be terminal-only.`);
        this.config.webhookUrl = undefined;
      }
    }
  }

  /** Record an event processed by Guard */
  recordEvent(blocked: boolean): void {
    this.eventsProcessed++;
    if (blocked) this.threatsBlocked++;
  }

  /** Record a skill audit */
  recordAudit(): void {
    this.skillsAudited++;
  }

  /** Start the periodic digest */
  start(rulesActive: number): void {
    if (this.timer) return;

    // First digest after 1 hour (give Guard time to accumulate)
    const firstDelay = Math.min(60 * 60 * 1000, this.config.intervalMs);
    setTimeout(() => {
      void this.emit(rulesActive);
    }, firstDelay);

    this.timer = setInterval(() => {
      void this.emit(rulesActive);
    }, this.config.intervalMs);

    logger.info(`Weekly digest started (interval: ${this.config.intervalMs / 86400000}d)`);
  }

  /** Stop the digest */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Emit a digest */
  async emit(rulesActive: number): Promise<DigestData> {
    // Global stats from TC (best-effort, degrade to null if unavailable)
    const globalStats: DigestData['global'] = null;
    // TODO: Add TC fetchGlobalStats() method for community rule counts

    const digest: DigestData = {
      period: {
        from: new Date(Date.now() - this.config.intervalMs).toISOString(),
        to: new Date().toISOString(),
      },
      local: {
        eventsProcessed: this.eventsProcessed,
        threatsBlocked: this.threatsBlocked,
        skillsAudited: this.skillsAudited,
        rulesActive,
      },
      global: globalStats,
    };

    // Log to terminal
    logger.info(
      `Security Digest: ${digest.local.threatsBlocked} threats blocked, ` +
        `${digest.local.skillsAudited} skills audited, ` +
        `${digest.local.rulesActive} rules active` +
        (digest.global ? `, ${digest.global.communityRules} community rules` : '')
    );

    // Deliver via webhook
    if (this.config.webhookUrl) {
      await this.deliverWebhook(digest);
    }

    // Reset counters
    this.eventsProcessed = 0;
    this.threatsBlocked = 0;
    this.skillsAudited = 0;

    return digest;
  }

  private async deliverWebhook(digest: DigestData): Promise<void> {
    const url = this.config.webhookUrl;
    if (!url) return;

    // Re-validate at delivery time (defense in depth)
    const err = validateWebhookUrl(url);
    if (err) {
      logger.warn(`Webhook delivery blocked: ${err}`);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'panguard.weekly_digest', data: digest }),
        signal: controller.signal,
        redirect: 'error', // Do not follow redirects (SSRF mitigation)
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        logger.warn(`Webhook delivery failed: HTTP ${resp.status}`);
      }
    } catch (fetchErr) {
      logger.warn(
        `Webhook delivery error: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`
      );
    }
  }
}
