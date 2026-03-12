/**
 * Daily Summary Collector - Aggregate and report 24h guard activity
 * 每日摘要收集器 - 彙整並報告 24 小時守護活動
 *
 * Accumulates threat, event, and skill audit stats over a 24-hour window.
 * At the end of each period, generates a summary report and renders it
 * to the terminal (and optionally persists to disk).
 *
 * @module @panguard-ai/panguard-guard/summary/daily-summary
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { c, symbols, divider, createLogger } from '@panguard-ai/core';

const logger = createLogger('panguard-guard:daily-summary');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailySummaryData {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly eventsProcessed: number;
  readonly threatsDetected: number;
  readonly threatsBlocked: number;
  readonly threatsByCategory: Readonly<Record<string, number>>;
  readonly skillsAudited: number;
  readonly skillsWhitelisted: number;
  readonly skillsFlagged: number;
  readonly topSources: ReadonlyArray<{ readonly source: string; readonly count: number }>;
}

// ---------------------------------------------------------------------------
// Daily Summary Collector
// ---------------------------------------------------------------------------

export class DailySummaryCollector {
  private timer: ReturnType<typeof setInterval> | null = null;
  private periodStart: Date;
  private readonly persistPath: string;

  // Counters
  private eventsProcessed = 0;
  private threatsDetected = 0;
  private threatsBlocked = 0;
  private readonly threatsByCategory: Record<string, number> = {};
  private skillsAudited = 0;
  private skillsWhitelisted = 0;
  private skillsFlagged = 0;
  private readonly sourceCounts: Record<string, number> = {};

  constructor(dataDir: string) {
    this.periodStart = new Date();
    this.persistPath = join(dataDir, 'daily-summary.json');
  }

  /** Start the 24h collection timer */
  start(): void {
    if (this.timer) return;

    const intervalMs = 24 * 60 * 60 * 1000; // 24 hours
    this.timer = setInterval(() => {
      const summary = this.generateSummary();
      this.persist(summary);
      this.renderSummary(summary);
      this.reset();
    }, intervalMs);
    this.timer.unref();

    logger.info('Daily summary collector started');
  }

  /** Stop the collector */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('Daily summary collector stopped');
  }

  /** Record a processed event */
  recordEvent(): void {
    this.eventsProcessed++;
  }

  /** Record a threat detection */
  recordThreat(category: string, blocked: boolean, source?: string): void {
    this.threatsDetected++;
    if (blocked) this.threatsBlocked++;

    this.threatsByCategory[category] = (this.threatsByCategory[category] ?? 0) + 1;

    if (source) {
      this.sourceCounts[source] = (this.sourceCounts[source] ?? 0) + 1;
    }
  }

  /** Record a skill audit */
  recordSkillAudit(whitelisted: boolean, flagged: boolean): void {
    this.skillsAudited++;
    if (whitelisted) this.skillsWhitelisted++;
    if (flagged) this.skillsFlagged++;
  }

  /** Generate the summary data for the current period */
  generateSummary(): DailySummaryData {
    const now = new Date();

    // Top 5 sources by count
    const topSources = Object.entries(this.sourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    return {
      periodStart: this.periodStart.toISOString(),
      periodEnd: now.toISOString(),
      eventsProcessed: this.eventsProcessed,
      threatsDetected: this.threatsDetected,
      threatsBlocked: this.threatsBlocked,
      threatsByCategory: { ...this.threatsByCategory },
      skillsAudited: this.skillsAudited,
      skillsWhitelisted: this.skillsWhitelisted,
      skillsFlagged: this.skillsFlagged,
      topSources,
    };
  }

  /** Persist summary to disk */
  private persist(data: DailySummaryData): void {
    try {
      const dir = dirname(this.persistPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Load existing summaries and append
      let history: DailySummaryData[] = [];
      if (existsSync(this.persistPath)) {
        try {
          const raw = readFileSync(this.persistPath, 'utf-8');
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            history = parsed as DailySummaryData[];
          }
        } catch {
          // Corrupted file, start fresh
        }
      }

      // Keep last 30 days
      history.push(data);
      if (history.length > 30) {
        history = history.slice(-30);
      }

      writeFileSync(this.persistPath, JSON.stringify(history, null, 2), 'utf-8');
      logger.info(`Daily summary persisted to ${this.persistPath}`);
    } catch (err) {
      logger.warn(
        `Failed to persist daily summary: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /** Reset counters for a new period */
  private reset(): void {
    this.periodStart = new Date();
    this.eventsProcessed = 0;
    this.threatsDetected = 0;
    this.threatsBlocked = 0;
    this.skillsAudited = 0;
    this.skillsWhitelisted = 0;
    this.skillsFlagged = 0;

    // Clear objects by deleting all keys
    for (const key of Object.keys(this.threatsByCategory)) {
      delete this.threatsByCategory[key];
    }
    for (const key of Object.keys(this.sourceCounts)) {
      delete this.sourceCounts[key];
    }
  }

  /** Render the summary to the terminal */
  renderSummary(data: DailySummaryData): void {
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    console.log('');
    console.log(divider(`Daily Summary: ${startStr} - ${endStr}`));
    console.log('');

    // Events
    console.log(
      `  ${c.bold('Events Processed:')}  ${c.sage(data.eventsProcessed.toLocaleString())}`
    );

    // Threats
    if (data.threatsDetected > 0) {
      console.log(`  ${c.bold('Threats Detected:')}  ${c.caution(String(data.threatsDetected))}`);
      console.log(`  ${c.bold('Threats Blocked:')}   ${c.safe(String(data.threatsBlocked))}`);

      // By category
      const categories = Object.entries(data.threatsByCategory);
      if (categories.length > 0) {
        console.log(`  ${c.dim('By category:')}`);
        for (const [cat, count] of categories.sort(([, a], [, b]) => b - a)) {
          console.log(`    ${c.dim('-')} ${cat}: ${c.caution(String(count))}`);
        }
      }

      // Top sources
      if (data.topSources.length > 0) {
        console.log(`  ${c.dim('Top sources:')}`);
        for (const { source, count } of data.topSources) {
          console.log(`    ${c.dim('-')} ${c.sage(source)}: ${count} threat(s)`);
        }
      }
    } else {
      console.log(`  ${symbols.pass} ${c.safe('No threats detected')}`);
    }

    // Skills
    if (data.skillsAudited > 0) {
      console.log('');
      console.log(`  ${c.bold('Skills Audited:')}    ${c.sage(String(data.skillsAudited))}`);
      if (data.skillsWhitelisted > 0) {
        console.log(`  ${c.bold('  Whitelisted:')}    ${c.safe(String(data.skillsWhitelisted))}`);
      }
      if (data.skillsFlagged > 0) {
        console.log(`  ${c.bold('  Flagged:')}        ${c.caution(String(data.skillsFlagged))}`);
      }
    }

    console.log('');
    console.log(divider());
    console.log('');
  }

  /** Load the most recent summary from disk (for status command) */
  static loadLatest(dataDir: string): DailySummaryData | null {
    const filePath = join(dataDir, 'daily-summary.json');
    if (!existsSync(filePath)) return null;

    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[parsed.length - 1] as DailySummaryData;
      }
    } catch {
      // Corrupted or empty file
    }

    return null;
  }
}
