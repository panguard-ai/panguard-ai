/**
 * LLM Reviewer for ATR Proposals
 * ATR 提案 LLM 審查器
 *
 * Uses the Anthropic API (via node:https) to review ATR rule proposals
 * for production readiness. Evaluates false positive risk, coverage,
 * detection specificity, response proportionality, and YAML validity.
 *
 * @module @panguard-ai/threat-cloud/llm-reviewer
 */

import * as https from 'node:https';
import type { ThreatCloudDB } from './database.js';

/** LLM review verdict structure */
interface LLMVerdict {
  approved: boolean;
  falsePositiveRisk: 'low' | 'medium' | 'high';
  coverageScore: number;
  reasoning: string;
}

/** Timeout for LLM API calls in milliseconds */
const LLM_TIMEOUT_MS = 60_000;

/** Default model for review */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * LLM Reviewer for ATR rule proposals
 * ATR 規則提案 LLM 審查器
 */
export class LLMReviewer {
  private readonly apiKey: string;
  private readonly db: ThreatCloudDB;
  private readonly model: string;

  constructor(apiKey: string, db: ThreatCloudDB, model?: string) {
    this.apiKey = apiKey;
    this.db = db;
    this.model = model ?? DEFAULT_MODEL;
  }

  /** Check if the reviewer is available (API key is set) / 檢查審查器是否可用 */
  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Review an ATR proposal via Anthropic API
   * 透過 Anthropic API 審查 ATR 提案
   */
  async reviewProposal(
    patternHash: string,
    ruleContent: string
  ): Promise<{ verdict: string; approved: boolean }> {
    const prompt = this.buildReviewPrompt(ruleContent);

    let responseText: string;
    try {
      responseText = await this.callAnthropicAPI(prompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`LLM review failed for ${patternHash}: ${msg}`);
      // Store failure verdict
      const failVerdict = JSON.stringify({
        approved: false,
        falsePositiveRisk: 'high',
        coverageScore: 0,
        reasoning: `LLM review failed: ${msg}`,
      });
      this.db.updateATRProposalLLMReview(patternHash, failVerdict);
      return { verdict: failVerdict, approved: false };
    }

    // Parse the LLM response
    const verdict = this.parseVerdict(responseText);
    const verdictJson = JSON.stringify(verdict);

    // Store verdict in database
    this.db.updateATRProposalLLMReview(patternHash, verdictJson);

    // If high false positive risk AND not approved, reject the proposal
    if (!verdict.approved && verdict.falsePositiveRisk === 'high') {
      this.db.rejectATRProposal(patternHash);
    }

    return { verdict: verdictJson, approved: verdict.approved };
  }

  /**
   * Build the review prompt for the LLM
   * 建構 LLM 審查提示
   */
  private buildReviewPrompt(ruleContent: string): string {
    return `You are a senior cybersecurity rule reviewer for the ATR (Agent Threat Rules) standard.

Review this auto-generated ATR rule for production readiness.

\`\`\`yaml
${ruleContent}
\`\`\`

Evaluate the following criteria:

1. FALSE POSITIVE RISK (low/medium/high)
   - How likely is this rule to trigger on benign activity?
   - Are the detection conditions overly broad or vague?

2. COVERAGE SCORE (0-100)
   - How well does this rule cover the intended attack pattern?
   - Does it account for common variations and evasion techniques?

3. DETECTION SPECIFICITY
   - Are the detection conditions specific enough to avoid false positives?
   - Are regex patterns well-crafted and not overly greedy?

4. RESPONSE PROPORTIONALITY
   - Are the recommended response actions appropriate for the severity level?
   - Would the response cause unnecessary disruption for false positives?

5. YAML VALIDITY
   - Is the YAML well-formed?
   - Does it conform to ATR schema (required fields: title, id, severity, detection)?

Output ONLY valid JSON (no markdown, no explanation outside the JSON):
{"approved": true/false, "falsePositiveRisk": "low"|"medium"|"high", "coverageScore": 0-100, "reasoning": "brief explanation of your decision"}`;
  }

  /**
   * Call the Anthropic API using node:https
   * 透過 node:https 呼叫 Anthropic API
   */
  private callAnthropicAPI(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const requestBody = JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(requestBody),
        },
        timeout: LLM_TIMEOUT_MS,
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');

          if (res.statusCode !== 200) {
            reject(
              new Error(`Anthropic API returned status ${res.statusCode}: ${body.slice(0, 500)}`)
            );
            return;
          }

          try {
            const parsed = JSON.parse(body) as {
              content?: Array<{ type: string; text?: string }>;
            };
            const textBlock = parsed.content?.find((c) => c.type === 'text');
            if (textBlock?.text) {
              resolve(textBlock.text);
            } else {
              reject(new Error('Anthropic API response missing text content'));
            }
          } catch (err) {
            reject(
              new Error(
                `Failed to parse Anthropic API response: ${err instanceof Error ? err.message : String(err)}`
              )
            );
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Anthropic API request timed out after ${LLM_TIMEOUT_MS}ms`));
      });

      req.on('error', (err) => {
        reject(new Error(`Anthropic API request failed: ${err.message}`));
      });

      req.write(requestBody);
      req.end();
    });
  }

  /**
   * Parse the LLM response into a structured verdict
   * 解析 LLM 回應為結構化裁決
   */
  private parseVerdict(responseText: string): LLMVerdict {
    const defaultVerdict: LLMVerdict = {
      approved: false,
      falsePositiveRisk: 'high',
      coverageScore: 0,
      reasoning: 'Failed to parse LLM response',
    };

    try {
      // Extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { ...defaultVerdict, reasoning: 'No JSON found in LLM response' };
      }

      const parsed = JSON.parse(jsonMatch[0]) as Partial<LLMVerdict>;

      // Validate and normalize fields
      const approved = parsed.approved === true;

      const validRisks = ['low', 'medium', 'high'] as const;
      const falsePositiveRisk = validRisks.includes(
        parsed.falsePositiveRisk as (typeof validRisks)[number]
      )
        ? (parsed.falsePositiveRisk as 'low' | 'medium' | 'high')
        : 'high';

      const coverageScore =
        typeof parsed.coverageScore === 'number'
          ? Math.max(0, Math.min(100, Math.round(parsed.coverageScore)))
          : 0;

      const reasoning =
        typeof parsed.reasoning === 'string'
          ? parsed.reasoning.slice(0, 1000)
          : 'No reasoning provided';

      return { approved, falsePositiveRisk, coverageScore, reasoning };
    } catch {
      return defaultVerdict;
    }
  }
}
