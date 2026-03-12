/**
 * Interactive Threat Handler - Confidence-based threat response routing
 * 互動式威脅處理器 - 基於信心度的威脅回應路由
 *
 * Routes threat responses based on confidence level:
 * - >= 90: Auto-respond (block + display)
 * - 70-89: Interactive (prompt user for decision)
 * - < 70:  Log silently
 *
 * @module @panguard-ai/panguard-guard/cli/interactive-handler
 */

import { c, symbols, promptSelect } from '@panguard-ai/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThreatResponseAction = 'auto' | 'interactive' | 'log';

export interface ThreatContext {
  readonly category: string;
  readonly sourceIP: string;
  readonly confidence: number;
  readonly details: string;
  readonly timestamp: string;
}

export type ThreatDecision = 'block' | 'allow' | 'investigate';

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Classify how to handle a threat based on confidence level.
 * >= 90 → auto-respond; 70-89 → interactive; < 70 → log only
 */
export function classifyThreatResponse(confidence: number): ThreatResponseAction {
  if (confidence >= 90) return 'auto';
  if (confidence >= 70) return 'interactive';
  return 'log';
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Display auto-response notification */
export function renderAutoResponse(context: ThreatContext, action: string): void {
  const time = context.timestamp;
  console.log('');
  console.log(`  ${symbols.fail} ${c.critical(`[${time}]`)} ${c.bold('THREAT AUTO-BLOCKED')}`);
  console.log(`      Category: ${c.bold(context.category)}`);
  console.log(`      Source:   ${c.sage(context.sourceIP)}`);
  console.log(`      Confidence: ${c.critical(`${context.confidence}%`)}`);
  console.log(`      Action:   ${c.safe(action)}`);
  if (context.details) {
    console.log(`      Details:  ${c.dim(context.details)}`);
  }
  console.log('');
}

/** Display low-confidence note (for log-only events) */
export function renderLowConfidenceNote(context: ThreatContext): void {
  const time = context.timestamp;
  console.log(
    c.dim(
      `  [${time}] Low-confidence event logged: ${context.category} from ${context.sourceIP} (${context.confidence}%)`
    )
  );
}

// ---------------------------------------------------------------------------
// Interactive Prompt
// ---------------------------------------------------------------------------

/**
 * Prompt the user for a threat decision.
 * Times out after 30 seconds and defaults to 'block'.
 */
export async function promptThreatDecision(context: ThreatContext): Promise<ThreatDecision> {
  console.log('');
  console.log(
    `  ${symbols.warn} ${c.caution(`[${context.timestamp}]`)} ${c.bold('THREAT DETECTED - Action Required')}`
  );
  console.log(`      Category:   ${c.bold(context.category)}`);
  console.log(`      Source:     ${c.sage(context.sourceIP)}`);
  console.log(`      Confidence: ${c.caution(`${context.confidence}%`)}`);
  if (context.details) {
    console.log(`      Details:    ${c.dim(context.details)}`);
  }
  console.log('');

  // Use a timeout race for the interactive prompt
  const timeoutMs = 30_000;

  const promptResult = promptSelect<ThreatDecision>({
    title: {
      en: 'How do you want to respond?',
      'zh-TW': '您要如何回應？',
    },
    options: [
      {
        label: { en: 'Block (deny access and log)', 'zh-TW': '封鎖（拒絕存取並記錄）' },
        value: 'block' as const,
      },
      {
        label: { en: 'Allow (whitelist this source)', 'zh-TW': '允許（將此來源加入白名單）' },
        value: 'allow' as const,
      },
      {
        label: { en: 'Investigate (log and monitor closely)', 'zh-TW': '調查（記錄並密切監控）' },
        value: 'investigate' as const,
      },
    ],
    lang: 'en',
    allowBack: false,
  });

  const timeoutResult = new Promise<ThreatDecision>((resolve) => {
    const timer = setTimeout(() => {
      console.log(c.dim(`  (Auto-blocking after ${timeoutMs / 1000}s timeout)`));
      resolve('block');
    }, timeoutMs);
    timer.unref();
  });

  const decision = await Promise.race([promptResult, timeoutResult]);

  // If user cancelled (null), default to block
  return decision ?? 'block';
}

// ---------------------------------------------------------------------------
// Event Queue for interactive mode
// ---------------------------------------------------------------------------

/**
 * Interactive threat queue - buffers events while user is being prompted.
 * Processes events sequentially to avoid overlapping prompts.
 */
export class InteractiveThreatQueue {
  private processing = false;
  private readonly queue: Array<{
    context: ThreatContext;
    resolve: (decision: ThreatDecision) => void;
  }> = [];

  /** Enqueue a threat for interactive handling. Returns the user's decision. */
  async enqueue(context: ThreatContext): Promise<ThreatDecision> {
    return new Promise<ThreatDecision>((resolve) => {
      this.queue.push({ context, resolve });
      void this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const item = this.queue.shift()!;

    try {
      const decision = await promptThreatDecision(item.context);
      item.resolve(decision);
    } catch {
      // On error, default to block
      item.resolve('block');
    }

    this.processing = false;
    void this.processNext();
  }
}
