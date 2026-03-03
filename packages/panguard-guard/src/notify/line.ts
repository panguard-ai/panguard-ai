/**
 * LINE Notify integration
 * LINE Notify 通知整合
 *
 * Sends threat alerts via LINE Notify API.
 * 透過 LINE Notify API 發送威脅警報。
 *
 * @module @panguard-ai/panguard-guard/notify/line
 */

import { request } from 'node:https';
import { createLogger } from '@panguard-ai/core';
import type { LineNotifyConfig, NotificationResult, ThreatVerdict } from '../types.js';

const logger = createLogger('panguard-guard:notify:line');

/**
 * Send a threat alert via LINE Notify
 * 透過 LINE Notify 發送威脅警報
 */
export async function sendLineNotify(
  config: LineNotifyConfig,
  verdict: ThreatVerdict,
  eventDescription: string
): Promise<NotificationResult> {
  const conclusionLabel =
    verdict.conclusion === 'malicious'
      ? 'MALICIOUS'
      : verdict.conclusion === 'suspicious'
        ? 'SUSPICIOUS'
        : 'BENIGN';

  const message =
    `\n[PanguardGuard Alert]\n` +
    `Conclusion: ${conclusionLabel}\n` +
    `Confidence: ${verdict.confidence}%\n` +
    `Action: ${verdict.recommendedAction}\n` +
    `Event: ${eventDescription}\n` +
    `${verdict.mitreTechnique ? `MITRE: ${verdict.mitreTechnique}\n` : ''}` +
    `Time: ${new Date().toISOString()}`;

  try {
    await postLineNotify(config.accessToken, message);
    logger.info('LINE notification sent / LINE 通知已發送');
    return { channel: 'line', success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`LINE notification failed: ${msg} / LINE 通知失敗: ${msg}`);
    return { channel: 'line', success: false, error: msg };
  }
}

/**
 * POST to LINE Notify API
 */
function postLineNotify(accessToken: string, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const payload = `message=${encodeURIComponent(message)}`;

    const req = request(
      {
        hostname: 'notify-api.line.me',
        port: 443,
        path: '/api/notify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: `Bearer ${accessToken}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`LINE Notify HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
