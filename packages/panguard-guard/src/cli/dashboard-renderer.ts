/**
 * Dashboard Renderer - ANSI TUI dashboard for Panguard Guard
 * 儀表板渲染器 - Panguard Guard 的 ANSI TUI 儀表板
 *
 * Zero-dependency terminal dashboard using core CLI utilities.
 * Renders a live-updating status panel with events, threats, and rule stats.
 *
 * @module @panguard-ai/panguard-guard/cli/dashboard-renderer
 */

import { c, symbols, box, formatDuration } from '@panguard-ai/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardState {
  readonly status: 'protected' | 'learning' | 'stopped';
  readonly uptime: number;
  readonly eventsProcessed: number;
  readonly threatsDetected: number;
  readonly actionsExecuted: number;
  readonly mode: string;
  readonly ruleCounts: {
    readonly sigma: number;
    readonly atr: number;
  };
  readonly whitelistedSkills: number;
  readonly trackedSkills: number;
  readonly aiProvider?: string;
  readonly aiModel?: string;
  readonly learningProgress?: number;
}

export interface TuiEvent {
  readonly time: string;
  readonly icon: string;
  readonly message: string;
}

export interface TuiThreat {
  readonly time: string;
  readonly category: string;
  readonly source: string;
  readonly action: string;
  readonly confidence: number;
}

// ---------------------------------------------------------------------------
// Ring Buffer
// ---------------------------------------------------------------------------

class RingBuffer<T> {
  private readonly items: T[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.maxSize) {
      this.items.shift();
    }
  }

  getAll(): readonly T[] {
    return this.items;
  }
}

// ---------------------------------------------------------------------------
// Dashboard Renderer
// ---------------------------------------------------------------------------

export class DashboardRenderer {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly events = new RingBuffer<TuiEvent>(10);
  private readonly threats = new RingBuffer<TuiThreat>(5);
  private readonly refreshInterval: number;

  constructor(refreshInterval = 5000) {
    this.refreshInterval = refreshInterval;
  }

  /** Push a new event to the event log ring buffer */
  pushEvent(event: TuiEvent): void {
    this.events.push(event);
  }

  /** Push a new threat to the threat ring buffer */
  pushThreat(threat: TuiThreat): void {
    this.threats.push(threat);
  }

  /** Start auto-refreshing the dashboard */
  start(getState: () => DashboardState): void {
    if (!process.stdout.isTTY) {
      // Non-TTY: fall back to quiet mode (no rendering)
      return;
    }

    // Initial render
    this.render(getState());

    this.timer = setInterval(() => {
      this.render(getState());
    }, this.refreshInterval);
    this.timer.unref();
  }

  /** Stop auto-refreshing */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Show cursor
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?25h');
    }
  }

  /** Render the full dashboard to the terminal */
  render(state: DashboardState): void {
    if (!process.stdout.isTTY) return;

    // Clear screen and move cursor to top
    process.stdout.write('\x1b[2J\x1b[H');
    // Hide cursor
    process.stdout.write('\x1b[?25l');

    const lines: string[] = [];

    // Status line
    const statusText =
      state.status === 'protected'
        ? c.safe('PROTECTED')
        : state.status === 'learning'
          ? c.caution('LEARNING')
          : c.critical('STOPPED');

    const uptimeText = state.uptime > 0 ? formatDuration(state.uptime) : '-';

    // Header
    lines.push(
      `${c.bold('Status:')} ${statusText}          ${c.bold('Uptime:')} ${c.sage(uptimeText)}`
    );
    lines.push(
      `${c.bold('Events:')} ${c.sage(state.eventsProcessed.toLocaleString().padEnd(16))}${c.bold('Threats:')} ${state.threatsDetected > 0 ? c.caution(String(state.threatsDetected)) : c.dim('0')}`
    );

    // Skills line
    const skillLine = `${c.bold('Skills:')} ${c.sage(String(state.trackedSkills))} tracked (${c.safe(String(state.whitelistedSkills))} whitelisted)`;
    lines.push(skillLine);

    // Learning progress
    if (state.status === 'learning' && state.learningProgress !== undefined) {
      lines.push(
        `${c.bold('Learning:')} ${c.caution(`${Math.round(state.learningProgress * 100)}%`)} complete`
      );
    }

    // Separator
    lines.push('');

    // Recent events
    const recentEvents = this.events.getAll();
    if (recentEvents.length > 0) {
      lines.push(c.dim('Recent:'));
      for (const evt of recentEvents.slice(-6)) {
        lines.push(`${c.dim(evt.time)}  ${evt.icon} ${evt.message}`);
      }
    } else {
      lines.push(c.dim('Recent: (no events yet)'));
    }

    // Separator
    lines.push('');

    // Recent threats
    const recentThreats = this.threats.getAll();
    if (recentThreats.length > 0) {
      lines.push(c.caution('Threats:'));
      for (const t of recentThreats.slice(-3)) {
        const conf =
          t.confidence >= 90 ? c.critical(`${t.confidence}%`) : c.caution(`${t.confidence}%`);
        lines.push(
          `${c.dim(t.time)}  ${symbols.warn} ${t.category} from ${c.sage(t.source)} ${c.dim('|')} ${conf} ${c.dim('|')} ${t.action}`
        );
      }
    }

    // Separator
    lines.push('');

    // Rule layers
    const { sigma, atr } = state.ruleCounts;
    let layerLine = `${c.bold('Layer 1:')} ${c.sage(`${sigma.toLocaleString()} Sigma`)} + ${c.sage(`${atr} ATR`)}`;

    if (state.aiProvider) {
      layerLine += `\n${c.bold('Layer 2:')} ${c.sage(`${state.aiProvider} (${state.aiModel ?? 'default'})`)}`;
    }

    lines.push(layerLine);

    const content = lines.join('\n');

    process.stdout.write(
      box(content, {
        title: 'PANGUARD GUARD',
        borderColor:
          state.status === 'protected'
            ? c.sage
            : state.status === 'learning'
              ? c.caution
              : c.critical,
        width: Math.min(process.stdout.columns ? process.stdout.columns - 6 : 70, 74),
      })
    );

    process.stdout.write('\n\n');
    process.stdout.write(c.dim('  Press Ctrl+C to stop'));
    process.stdout.write('\n');
  }
}
