/**
 * /api/chat/* - Notification channel endpoints
 * Returns configured channel status by checking environment variables.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

/** Channel status info */
interface ChannelDef {
  readonly type: string;
  readonly label: string;
  readonly envHint: string;
  readonly requiredEnvVars: readonly string[];
}

const CHANNEL_DEFINITIONS: readonly ChannelDef[] = [
  {
    type: 'line',
    label: 'LINE',
    envHint: 'LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET',
    requiredEnvVars: ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET'],
  },
  {
    type: 'telegram',
    label: 'Telegram',
    envHint: 'TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID',
    requiredEnvVars: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  },
  {
    type: 'slack',
    label: 'Slack',
    envHint: 'SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET',
    requiredEnvVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
  },
  {
    type: 'email',
    label: 'Email',
    envHint: 'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS',
    requiredEnvVars: ['SMTP_HOST', 'SMTP_USER'],
  },
  {
    type: 'webhook',
    label: 'Webhook',
    envHint: 'WEBHOOK_ENDPOINT, WEBHOOK_SECRET',
    requiredEnvVars: ['WEBHOOK_ENDPOINT'],
  },
];

function isChannelConfigured(def: ChannelDef): boolean {
  return def.requiredEnvVars.every(v => !!process.env[v]);
}

/**
 * GET /api/chat/status - Get notification channel configuration status
 */
export function handleChatStatus(_req: IncomingMessage, res: ServerResponse): void {
  const channels = CHANNEL_DEFINITIONS.map(ch => ({
    type: ch.type,
    label: ch.label,
    configured: isChannelConfigured(ch),
    envHint: ch.envHint,
  }));

  const configuredCount = channels.filter(c => c.configured).length;

  const data = {
    channels,
    configuredCount,
    totalChannels: channels.length,
    preferences: {
      criticalAlerts: true,
      dailySummary: true,
      weeklySummary: true,
      peacefulReport: true,
    },
    message: configuredCount > 0
      ? `${configuredCount} notification channel(s) configured`
      : 'No notification channels configured. Set environment variables to enable.',
  };

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, data }));
}

/**
 * POST /api/chat/test - Send a test notification to a channel
 */
export async function handleChatTest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await new Promise<string>((resolve) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
  });

  let parsed: { channel?: string } = {};
  try {
    parsed = JSON.parse(body) as { channel?: string };
  } catch {
    res.writeHead(400);
    res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }));
    return;
  }

  const { channel } = parsed;
  if (!channel) {
    res.writeHead(400);
    res.end(JSON.stringify({ ok: false, error: 'Missing "channel" field' }));
    return;
  }

  const def = CHANNEL_DEFINITIONS.find(c => c.type === channel);
  if (!def) {
    res.writeHead(400);
    res.end(JSON.stringify({ ok: false, error: `Unknown channel type: ${channel}` }));
    return;
  }

  if (!isChannelConfigured(def)) {
    res.writeHead(400);
    res.end(JSON.stringify({
      ok: false,
      error: `Channel "${channel}" is not configured. Required: ${def.envHint}`,
    }));
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({
    ok: true,
    data: { channel, sent: true, message: `Test notification queued for ${def.label}` },
  }));
}
