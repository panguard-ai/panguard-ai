/**
 * Discord Channel
 * Discord 管道
 *
 * Discord webhook notification channel using Discord Webhook API.
 * No Bot token needed - only a webhook URL.
 * 使用 Discord Webhook API 的通知管道。
 * 不需要 Bot token，只需 webhook URL。
 *
 * Recommended for developer teams using Discord for communication.
 * 推薦給使用 Discord 進行溝通的開發團隊。
 *
 * @module @panguard-ai/panguard-chat/channels/discord
 */

import { createLogger } from '@panguard-ai/core';
import type {
  MessagingChannel,
  ChannelResult,
  FormattedMessage,
  ThreatAlert,
  ReplyHandler,
  DiscordChannelConfig,
  AlertSeverity,
} from '../types.js';

const logger = createLogger('panguard-chat:channel:discord');

// ---------------------------------------------------------------------------
// Discord Embed Color Mapping
// Discord Embed 顏色對應
// ---------------------------------------------------------------------------

/** Map threat severity to Discord embed color (decimal integer) */
function severityToEmbedColor(severity: ThreatAlert['severity']): number {
  switch (severity) {
    case 'critical':
      return 0xff0000; // Red
    case 'high':
      return 0xff8c00; // Orange
    case 'medium':
      return 0xffd700; // Yellow
    case 'low':
      return 0x3498db; // Blue
    case 'info':
    default:
      return 0x95a5a6; // Gray
  }
}

/** Map AlertSeverity (used in FormattedMessage) to Discord embed color */
function alertSeverityToEmbedColor(severity?: AlertSeverity): number {
  switch (severity) {
    case 'critical':
      return 0xff0000;
    case 'warning':
      return 0xff8c00;
    case 'info':
    default:
      return 0x3498db;
  }
}

// ---------------------------------------------------------------------------
// Discord Embed Interfaces
// Discord Embed 介面
// ---------------------------------------------------------------------------

interface DiscordEmbedField {
  readonly name: string;
  readonly value: string;
  readonly inline?: boolean;
}

interface DiscordEmbed {
  readonly title: string;
  readonly description: string;
  readonly color: number;
  readonly fields?: readonly DiscordEmbedField[];
  readonly timestamp?: string;
  readonly footer?: { readonly text: string };
}

interface DiscordWebhookPayload {
  readonly content?: string;
  readonly username?: string;
  readonly embeds?: readonly DiscordEmbed[];
}

// ---------------------------------------------------------------------------
// Parsed Webhook URL
// 解析後的 Webhook URL
// ---------------------------------------------------------------------------

interface ParsedWebhookUrl {
  readonly hostname: string;
  readonly path: string;
}

// ---------------------------------------------------------------------------
// Discord Channel Implementation
// Discord 管道實作
// ---------------------------------------------------------------------------

/**
 * Discord webhook notification channel
 * Discord webhook 通知管道
 */
export class DiscordChannel implements MessagingChannel {
  readonly channelType = 'discord' as const;
  private readonly config: DiscordChannelConfig;
  private readonly parsedUrl: ParsedWebhookUrl;
  private replyHandler: ReplyHandler | null = null;

  constructor(config: DiscordChannelConfig) {
    this.config = config;
    this.parsedUrl = this.parseWebhookUrl(config.webhookUrl);
    logger.info('Discord channel initialized / Discord 管道已初始化');
  }

  /**
   * Send a formatted message via Discord webhook
   * 透過 Discord webhook 發送格式化訊息
   */
  async sendMessage(_userId: string, message: FormattedMessage): Promise<ChannelResult> {
    try {
      const payload: DiscordWebhookPayload = {
        username: this.config.username ?? 'Panguard AI',
        embeds: [
          {
            title: 'Panguard Notification',
            description: message.text,
            color: alertSeverityToEmbedColor(message.severity),
            timestamp: new Date().toISOString(),
            footer: { text: 'Panguard AI Security' },
          },
        ],
      };

      await this.httpPost(JSON.stringify(payload));

      logger.info('Discord message sent / Discord 訊息已發送');
      return { success: true, channel: 'discord' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Discord send failed: ${msg} / Discord 發送失敗: ${msg}`);
      return { success: false, channel: 'discord', error: msg };
    }
  }

  /**
   * Send a threat alert as a Discord embed
   * 透過 Discord embed 發送威脅告警
   */
  async sendAlert(_userId: string, alert: ThreatAlert): Promise<ChannelResult> {
    try {
      const fields: DiscordEmbedField[] = [
        { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
        { name: 'Conclusion', value: alert.conclusion, inline: true },
        { name: 'Confidence', value: `${Math.round(alert.confidence * 100)}%`, inline: true },
        { name: 'Event', value: alert.eventDescription },
        { name: 'Recommended Action', value: alert.recommendedAction },
      ];

      if (alert.mitreTechnique) {
        fields.push({
          name: 'MITRE ATT&CK',
          value: alert.mitreTechnique,
          inline: true,
        });
      }

      if (alert.actionsTaken && alert.actionsTaken.length > 0) {
        fields.push({
          name: 'Actions Taken',
          value: alert.actionsTaken.join('\n'),
        });
      }

      const payload: DiscordWebhookPayload = {
        username: this.config.username ?? 'Panguard AI',
        embeds: [
          {
            title: `Security Alert: ${alert.humanSummary}`,
            description: alert.reasoning,
            color: severityToEmbedColor(alert.severity),
            fields,
            timestamp: alert.timestamp,
            footer: { text: 'Panguard AI Security' },
          },
        ],
      };

      await this.httpPost(JSON.stringify(payload));

      logger.info(
        `Discord alert sent (${alert.severity}) / Discord 告警已發送 (${alert.severity})`
      );
      return { success: true, channel: 'discord' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Discord alert send failed: ${msg} / Discord 告警發送失敗: ${msg}`);
      return { success: false, channel: 'discord', error: msg };
    }
  }

  /**
   * Send a file via Discord webhook as multipart/form-data attachment
   * 透過 Discord webhook 以 multipart/form-data 附件發送檔案
   */
  async sendFile(_userId: string, file: Buffer, filename: string): Promise<ChannelResult> {
    try {
      const boundary = `----PanguardBoundary${Date.now()}`;
      const parts: Buffer[] = [];

      // JSON payload_json field (optional metadata)
      const jsonPayload = JSON.stringify({
        username: this.config.username ?? 'Panguard AI',
        content: `Security report: ${filename}`,
      });

      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n${jsonPayload}\r\n`
        )
      );

      // File field
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="files[0]"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
        )
      );
      parts.push(file);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

      const body = Buffer.concat(parts);

      await this.httpPostRaw(body, `multipart/form-data; boundary=${boundary}`);

      logger.info(`Discord file sent: ${filename} / Discord 檔案已發送: ${filename}`);
      return { success: true, channel: 'discord' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Discord file send failed: ${msg} / Discord 檔案發送失敗: ${msg}`);
      return { success: false, channel: 'discord', error: msg };
    }
  }

  /**
   * Register a reply handler for incoming Discord interactions
   * 註冊收到 Discord 互動的回覆處理器
   */
  onReply(handler: ReplyHandler): void {
    this.replyHandler = handler;
    logger.info('Discord reply handler registered / Discord 回覆處理器已註冊');
  }

  /**
   * Process an incoming Discord interaction (optional, for slash commands / buttons)
   * 處理傳入的 Discord 互動（選用，用於斜線指令/按鈕）
   */
  async processInteraction(interaction: {
    type?: string;
    userId?: string;
    data?: { name?: string; value?: string };
  }): Promise<string | null> {
    if (!this.replyHandler) {
      return null;
    }

    const text = interaction.data?.value ?? interaction.data?.name ?? '';
    if (!text) return null;

    return this.replyHandler(interaction.userId ?? '', text);
  }

  // -------------------------------------------------------------------------
  // URL Parsing
  // URL 解析
  // -------------------------------------------------------------------------

  /**
   * Parse a Discord webhook URL into hostname and path
   * 將 Discord webhook URL 解析為主機名稱和路徑
   */
  private parseWebhookUrl(webhookUrl: string): ParsedWebhookUrl {
    const url = new URL(webhookUrl);
    return {
      hostname: url.hostname,
      path: url.pathname,
    };
  }

  // -------------------------------------------------------------------------
  // HTTP Helpers
  // HTTP 輔助函式
  // -------------------------------------------------------------------------

  /**
   * Send JSON payload via HTTPS POST
   * 透過 HTTPS POST 發送 JSON 負載
   */
  private async httpPost(body: string): Promise<void> {
    const { hostname, path } = this.parsedUrl;

    return new Promise((resolve, reject) => {
      import('node:https')
        .then(({ request }) => {
          const req = request(
            {
              hostname,
              path,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
              },
            },
            (res) => {
              let data = '';
              res.on('data', (chunk: Buffer) => {
                data += chunk.toString();
              });
              res.on('end', () => {
                const statusCode = res.statusCode ?? 0;
                if (statusCode >= 200 && statusCode < 300) {
                  resolve();
                } else {
                  reject(new Error(`Discord API error ${statusCode}: ${data}`));
                }
              });
            }
          );
          req.on('error', reject);
          req.write(body);
          req.end();
        })
        .catch(reject);
    });
  }

  /**
   * Send raw binary payload via HTTPS POST (for multipart/form-data)
   * 透過 HTTPS POST 發送原始二進位負載（用於 multipart/form-data）
   */
  private async httpPostRaw(body: Buffer, contentType: string): Promise<void> {
    const { hostname, path } = this.parsedUrl;

    return new Promise((resolve, reject) => {
      import('node:https')
        .then(({ request }) => {
          const req = request(
            {
              hostname,
              path,
              method: 'POST',
              headers: {
                'Content-Type': contentType,
                'Content-Length': body.length,
              },
            },
            (res) => {
              let data = '';
              res.on('data', (chunk: Buffer) => {
                data += chunk.toString();
              });
              res.on('end', () => {
                const statusCode = res.statusCode ?? 0;
                if (statusCode >= 200 && statusCode < 300) {
                  resolve();
                } else {
                  reject(new Error(`Discord API error ${statusCode}: ${data}`));
                }
              });
            }
          );
          req.on('error', reject);
          req.write(body);
          req.end();
        })
        .catch(reject);
    });
  }
}
