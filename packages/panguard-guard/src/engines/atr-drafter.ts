/**
 * Local ATR Rule Drafter
 * 本地 ATR 規則草稿產生器
 *
 * Uses the Guard's own LLM (already configured via env vars or llm.enc)
 * to draft ATR rules from locally detected patterns, then submits
 * proposals to Threat Cloud for community consensus.
 *
 * This runs entirely on the user's machine using the user's own LLM API key.
 * No additional cost to the Panguard project.
 *
 * @module @panguard-ai/panguard-guard/engines/atr-drafter
 */

import { createHash } from 'node:crypto';
import { createLogger } from '@panguard-ai/core';
import type { SecurityEvent } from '@panguard-ai/core';
import type { AnalyzeLLM } from '../types.js';
import type { ThreatCloudClient } from '../threat-cloud/index.js';

const logger = createLogger('panguard-guard:atr-drafter');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Locally observed attack pattern for ATR drafting */
interface LocalPattern {
  attackType: string;
  mitreTechniques: string[];
  occurrences: number;
  distinctIPs: Set<string>;
  severities: Record<string, number>;
  sampleDescriptions: string[];
  atrRulesMatched: string[];
  firstSeen: string;
  lastSeen: string;
}

/** Draft result from LLM */
interface DraftResult {
  patternHash: string;
  ruleContent: string;
  selfReviewApproved: boolean;
  selfReviewVerdict: string;
}

/** Drafter configuration */
export interface ATRDrafterConfig {
  /** Minimum events before considering drafting a rule (default: 5) */
  minEvents: number;
  /** Minimum distinct IPs (default: 2) */
  minDistinctIPs: number;
  /** Time window for pattern accumulation in ms (default: 6 hours) */
  windowMs: number;
  /** Max proposals to submit per cycle (default: 3) */
  maxProposalsPerCycle: number;
  /** LLM provider name for metadata */
  llmProvider: string;
  /** LLM model name for metadata */
  llmModel: string;
}

const DEFAULT_CONFIG: ATRDrafterConfig = {
  minEvents: 5,
  minDistinctIPs: 2,
  windowMs: 6 * 60 * 60 * 1000,
  maxProposalsPerCycle: 3,
  llmProvider: 'unknown',
  llmModel: 'unknown',
};

// ---------------------------------------------------------------------------
// Drafter
// ---------------------------------------------------------------------------

export class ATRDrafter {
  private readonly config: ATRDrafterConfig;
  private readonly patterns = new Map<string, LocalPattern>();
  private readonly submittedPatterns = new Set<string>();
  private cycleTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly llm: AnalyzeLLM,
    private readonly threatCloud: ThreatCloudClient,
    config?: Partial<ATRDrafterConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a detected threat event for pattern accumulation.
   * Called by GuardEngine after a threat is detected.
   * 記錄偵測到的威脅事件用於模式累積
   */
  recordDetection(event: SecurityEvent, verdict: {
    conclusion: string;
    confidence: number;
    mitreTechniques?: string[];
    atrRulesMatched?: string[];
  }): void {
    // Only track suspicious/malicious verdicts with reasonable confidence
    if (verdict.conclusion === 'benign' || verdict.confidence < 50) return;

    const techniques = verdict.mitreTechniques ?? [];
    const key = `${event.category}|${techniques.sort().join(',')}`;
    const patternHash = createHash('sha256').update(key).digest('hex').slice(0, 16);

    let pattern = this.patterns.get(patternHash);
    if (!pattern) {
      pattern = {
        attackType: event.category,
        mitreTechniques: techniques,
        occurrences: 0,
        distinctIPs: new Set(),
        severities: {},
        sampleDescriptions: [],
        atrRulesMatched: [],
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      };
      this.patterns.set(patternHash, pattern);
    }

    pattern.occurrences++;
    pattern.lastSeen = new Date().toISOString();

    const ip = (event.metadata?.['sourceIP'] as string) ??
      (event.metadata?.['remoteAddress'] as string);
    if (ip) pattern.distinctIPs.add(ip);

    const severity = (event.metadata?.['severity'] as string) ?? 'medium';
    pattern.severities[severity] = (pattern.severities[severity] ?? 0) + 1;

    if (pattern.sampleDescriptions.length < 5) {
      pattern.sampleDescriptions.push(event.description.slice(0, 200));
    }

    if (verdict.atrRulesMatched) {
      for (const r of verdict.atrRulesMatched) {
        if (!pattern.atrRulesMatched.includes(r)) {
          pattern.atrRulesMatched.push(r);
        }
      }
    }
  }

  /**
   * Start periodic drafting cycle.
   * 啟動定期草稿產生週期
   */
  start(): void {
    if (this.cycleTimer) return;

    // Run first cycle after a delay to accumulate some events
    setTimeout(() => void this.runDraftCycle(), 30 * 60 * 1000); // 30 min initial delay

    this.cycleTimer = setInterval(
      () => void this.runDraftCycle(),
      this.config.windowMs
    );

    logger.info(
      `ATR drafter started (cycle: ${this.config.windowMs / 3600000}h) / ` +
        `ATR 草稿器已啟動 (週期: ${this.config.windowMs / 3600000}h)`
    );
  }

  /**
   * Stop the drafting cycle.
   * 停止草稿產生週期
   */
  stop(): void {
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }

  /**
   * Run a single draft cycle: find mature patterns, draft rules, submit proposals.
   * 執行單次草稿週期：找成熟模式 → 產生規則 → 提交提案
   */
  async runDraftCycle(): Promise<{ drafted: number; submitted: number }> {
    // Check LLM availability
    const available = await this.llm.isAvailable();
    if (!available) {
      logger.info('LLM not available, skipping ATR draft cycle / LLM 不可用，跳過 ATR 草稿週期');
      return { drafted: 0, submitted: 0 };
    }

    // Find patterns that meet threshold
    const maturePatterns: Array<{ hash: string; pattern: LocalPattern }> = [];

    for (const [hash, pattern] of this.patterns) {
      if (this.submittedPatterns.has(hash)) continue;

      if (
        pattern.occurrences >= this.config.minEvents &&
        pattern.distinctIPs.size >= this.config.minDistinctIPs
      ) {
        maturePatterns.push({ hash, pattern });
      }
    }

    if (maturePatterns.length === 0) {
      return { drafted: 0, submitted: 0 };
    }

    // Limit per cycle
    const toProcess = maturePatterns.slice(0, this.config.maxProposalsPerCycle);
    let drafted = 0;
    let submitted = 0;

    for (const { hash, pattern } of toProcess) {
      try {
        const result = await this.draftAndReview(hash, pattern);
        if (!result) continue;
        drafted++;

        if (result.selfReviewApproved) {
          const success = await this.threatCloud.submitATRProposal({
            patternHash: hash,
            ruleContent: result.ruleContent,
            llmProvider: this.config.llmProvider,
            llmModel: this.config.llmModel,
            selfReviewVerdict: result.selfReviewVerdict,
          });

          if (success) {
            submitted++;
            this.submittedPatterns.add(hash);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`ATR draft failed for pattern ${hash}: ${msg}`);
      }
    }

    // Cleanup old patterns
    this.cleanupOldPatterns();

    if (drafted > 0) {
      logger.info(
        `ATR draft cycle: ${drafted} drafted, ${submitted} submitted / ` +
          `ATR 草稿週期: ${drafted} 草稿, ${submitted} 已提交`
      );
    }

    return { drafted, submitted };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private async draftAndReview(
    patternHash: string,
    pattern: LocalPattern
  ): Promise<DraftResult | null> {
    // Step 1: Draft using LLM
    const draftPrompt = this.buildDraftPrompt(pattern);
    const draftResponse = await this.llm.analyze(draftPrompt);

    const ruleContent = this.extractYaml(draftResponse.summary);
    if (!ruleContent || ruleContent.length < 100) {
      return null;
    }

    // Step 2: Self-review using same LLM
    const reviewPrompt = this.buildReviewPrompt(ruleContent);
    const reviewResponse = await this.llm.analyze(reviewPrompt);

    let selfReviewApproved = false;
    let selfReviewVerdict = '{}';
    try {
      const jsonMatch = reviewResponse.summary.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { approved?: boolean };
        selfReviewApproved = parsed.approved === true;
        selfReviewVerdict = jsonMatch[0];
      }
    } catch {
      // Parse failed, reject
    }

    return {
      patternHash,
      ruleContent,
      selfReviewApproved,
      selfReviewVerdict,
    };
  }

  private buildDraftPrompt(pattern: LocalPattern): string {
    const samples = pattern.sampleDescriptions.map((d, i) => `  ${i + 1}. ${d}`).join('\n');
    const existingATR = pattern.atrRulesMatched.length > 0
      ? `\nExisting ATR rules already matching: ${pattern.atrRulesMatched.join(', ')}`
      : '';

    return `You are a cybersecurity expert. Generate an ATR (Agent Threat Rules) YAML rule for this attack pattern.

PATTERN:
- Attack Type: ${pattern.attackType}
- MITRE Techniques: ${pattern.mitreTechniques.join(', ') || 'unknown'}
- Occurrences: ${pattern.occurrences} from ${pattern.distinctIPs.size} distinct IPs
- Severity Distribution: ${JSON.stringify(pattern.severities)}
- Time Range: ${pattern.firstSeen} to ${pattern.lastSeen}
${existingATR}

SAMPLE EVENTS:
${samples}

REQUIREMENTS:
1. Follow ATR schema v0.1
2. Use id: ATR-AUTO-${pattern.attackType.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 20)}
3. Set status: "draft"
4. Use specific detection conditions (regex or contains), NOT overly broad
5. Include false_positives section
6. Include response actions appropriate to severity
7. Include test_cases (2 true_positives, 2 true_negatives)

Output ONLY the YAML rule in a \`\`\`yaml code block.`;
  }

  private buildReviewPrompt(ruleContent: string): string {
    return `Review this auto-generated ATR rule for production readiness.

\`\`\`yaml
${ruleContent}
\`\`\`

Evaluate:
1. FALSE POSITIVE RISK (low/medium/high)
2. COVERAGE SCORE (0-100)
3. Are detection conditions specific enough?
4. Are response actions appropriate?

Output JSON only:
{"approved": true/false, "falsePositiveRisk": "low"|"medium"|"high", "coverageScore": 0-100, "reasoning": "brief explanation"}`;
  }

  private extractYaml(text: string): string {
    const match = text.match(/```ya?ml\n([\s\S]*?)```/);
    if (match?.[1]) return match[1].trim();

    const lines = text.split('\n');
    const start = lines.findIndex((l) => l.startsWith('title:') || l.startsWith('schema_version:'));
    if (start >= 0) return lines.slice(start).join('\n').trim();

    return '';
  }

  private cleanupOldPatterns(): void {
    const cutoff = Date.now() - this.config.windowMs * 2;
    for (const [hash, pattern] of this.patterns) {
      if (new Date(pattern.lastSeen).getTime() < cutoff) {
        this.patterns.delete(hash);
        this.submittedPatterns.delete(hash);
      }
    }
  }

  /** Get current pattern count (for status display) */
  getPatternCount(): number {
    return this.patterns.size;
  }

  /** Get submitted proposal count */
  getSubmittedCount(): number {
    return this.submittedPatterns.size;
  }
}
