/**
 * Webhook notification integration
 * Webhook 通知整合
 *
 * Sends threat alerts to a configured HTTPS webhook endpoint.
 * 透過已配置的 HTTPS webhook 端點發送威脅警報。
 *
 * @module @panguard-ai/panguard-guard/notify/webhook
 */

import { request } from 'node:https';
import { createLogger } from '@panguard-ai/core';
import type { WebhookNotifyConfig, NotificationResult, ThreatVerdict } from '../types.js';
import { checkOutboundUrl } from '../net/validate-outbound-url.js';

const logger = createLogger('panguard-guard:notify:webhook');

/**
 * Send a threat alert via webhook
 * 透過 webhook 發送威脅警報
 */
export async function sendWebhookNotify(
  config: WebhookNotifyConfig,
  verdict: ThreatVerdict,
  eventDescription: string
): Promise<NotificationResult> {
  const payload = JSON.stringify({
    source: 'panguard-guard',
    timestamp: new Date().toISOString(),
    conclusion: verdict.conclusion,
    confidence: verdict.confidence,
    recommendedAction: verdict.recommendedAction,
    mitreTechnique: verdict.mitreTechnique ?? null,
    reasoning: verdict.reasoning,
    eventDescription,
  });

  try {
    await postWebhook(config.url, payload, config.secret);
    logger.info('Webhook notification sent / Webhook 通知已發送');
    return { channel: 'webhook', success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Webhook notification failed: ${msg} / Webhook 通知失敗: ${msg}`);
    return { channel: 'webhook', success: false, error: msg };
  }
}

/**
 * POST JSON payload to webhook URL
 */
function postWebhook(urlStr: string, payload: string, secret?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // SSRF guard: a webhook URL is user-supplied. Require https: and reject
    // private / reserved / loopback / metadata targets BEFORE issuing the
    // request, so a misconfigured or malicious URL cannot pivot to internal
    // services or the cloud metadata endpoint.
    const ssrfError = checkOutboundUrl(urlStr);
    if (ssrfError !== null) {
      reject(new Error(`Webhook URL rejected: ${ssrfError}`));
      return;
    }

    const url = new URL(urlStr);
    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'User-Agent': 'PanguardGuard/1.0',
    };

    if (secret) {
      headers['X-Panguard-Secret'] = secret;
    }

    const req = request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Webhook HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
