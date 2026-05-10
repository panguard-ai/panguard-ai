import { promises as fs } from 'fs';
import path from 'path';

/**
 * Append a row to a lead-capture store.
 *
 * Delivery channels (run in parallel — leads are critical, hit every channel
 * that's configured rather than racing for the first success):
 *   - LEAD_WEBHOOK_URL          generic JSON webhook (Zapier, Make, n8n)
 *   - LEAD_SLACK_WEBHOOK_URL    Slack incoming webhook (formatted blocks)
 *   - LEAD_DISCORD_WEBHOOK_URL  Discord webhook (formatted embed)
 *
 * Disk fallback (only when NO channel is configured — never silent on prod):
 *   - data/<sheet>.json         dev / self-hosted
 *   - /tmp/panguard-leads/...   Vercel serverless, ephemeral (lost on cold
 *                                start — see warning emitted to stderr)
 *
 * Set at least one channel env var in Vercel production. Lead capture
 * MUST not depend on /tmp since serverless cold starts wipe it.
 */
export async function appendToSheet(sheet: string, row: string[]) {
  const channels: Promise<unknown>[] = [];

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    channels.push(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet, row, timestamp: row[0] }),
      })
    );
  }

  const slackUrl = process.env.LEAD_SLACK_WEBHOOK_URL;
  if (slackUrl) {
    channels.push(
      fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formatSlackMessage(sheet, row) }),
      })
    );
  }

  const discordUrl = process.env.LEAD_DISCORD_WEBHOOK_URL;
  if (discordUrl) {
    channels.push(
      fetch(discordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `New PanGuard lead (${sheet})`,
          embeds: [formatDiscordEmbed(sheet, row)],
        }),
      })
    );
  }

  if (channels.length > 0) {
    const results = await Promise.allSettled(channels);
    results
      .filter((r) => r.status === 'rejected')
      .forEach((r) =>
        console.error(`[lead-capture] channel delivery failed`, (r as PromiseRejectedResult).reason)
      );
    return;
  }

  console.warn(
    `[lead-capture] no LEAD_WEBHOOK_URL / LEAD_SLACK_WEBHOOK_URL / LEAD_DISCORD_WEBHOOK_URL configured — falling back to disk (ephemeral on Vercel). Configure at least one channel in production.`
  );

  const dirs = [path.join(process.cwd(), 'data'), path.join('/tmp', 'panguard-leads')];
  for (const dataDir of dirs) {
    try {
      await fs.mkdir(dataDir, { recursive: true });
      const filePath = path.join(dataDir, `${sheet}.json`);

      let existing: string[][] = [];
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        existing = JSON.parse(raw);
      } catch {
        // File doesn't exist yet
      }

      existing.push(row);
      await fs.writeFile(filePath, JSON.stringify(existing, null, 2), 'utf-8');
      return;
    } catch {
      // Directory not writable, try next
    }
  }
}

function formatSlackMessage(sheet: string, row: string[]): string {
  const [timestamp, name, email, company, type, message] = row;
  return [
    `*New ${sheet} lead* — ${timestamp}`,
    `*Name:* ${name ?? '(n/a)'}`,
    `*Email:* ${email ?? '(n/a)'}`,
    `*Company:* ${company ?? '(n/a)'}`,
    `*Type:* ${type ?? '(n/a)'}`,
    '*Message:*',
    '```',
    message ?? '',
    '```',
  ].join('\n');
}

function formatDiscordEmbed(sheet: string, row: string[]) {
  const [timestamp, name, email, company, type, message] = row;
  return {
    title: `New ${sheet} lead`,
    timestamp: timestamp ?? new Date().toISOString(),
    color: 0x49a078,
    fields: [
      { name: 'Name', value: name || '(n/a)', inline: true },
      { name: 'Email', value: email || '(n/a)', inline: true },
      { name: 'Company', value: company || '(n/a)', inline: true },
      { name: 'Type', value: type || '(n/a)', inline: false },
      { name: 'Message', value: (message || '').slice(0, 1000) || '(empty)', inline: false },
    ],
  };
}
