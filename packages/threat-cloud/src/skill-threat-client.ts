/**
 * Skill Threat Intelligence client helpers
 * Skill 威脅情報客戶端輔助函式
 *
 * Provides simple functions for submitting and looking up
 * skill threat intelligence from Threat Cloud.
 *
 * @module @panguard-ai/threat-cloud/skill-threat-client
 */

import type {
  SkillThreatSubmission,
  SkillThreatLookup,
  ApiResponse,
} from './types.js';

/** Response from submitting a skill threat scan */
export interface SkillThreatSubmitResult {
  skillHash: string;
  scanCount: number;
  aggregateRiskScore: number;
}

/**
 * Validate that a Threat Cloud URL uses HTTPS in production.
 * 驗證 Threat Cloud URL 在生產環境使用 HTTPS。
 */
function validateBaseUrl(baseUrl: string): void {
  const isLocal = baseUrl.startsWith('http://localhost') || baseUrl.startsWith('http://127.0.0.1');
  if (!isLocal && baseUrl.startsWith('http://')) {
    throw new Error('Threat Cloud baseUrl must use HTTPS in production. API keys would be sent in cleartext over HTTP.');
  }
}

/**
 * Submit a skill threat scan result to Threat Cloud.
 * 提交 Skill 威脅掃描結果到威脅雲
 */
export async function submitSkillThreat(
  baseUrl: string,
  submission: SkillThreatSubmission,
  apiKey?: string
): Promise<ApiResponse<SkillThreatSubmitResult>> {
  validateBaseUrl(baseUrl);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/api/skill-threats`, {
    method: 'POST',
    headers,
    body: JSON.stringify(submission),
    signal: AbortSignal.timeout(10_000),
  });

  const result = (await response.json()) as ApiResponse<SkillThreatSubmitResult>;
  return result;
}

/**
 * Look up skill threat intelligence by skill hash.
 * 依 Skill 雜湊查詢威脅情報
 */
export async function lookupSkillThreat(
  baseUrl: string,
  skillHash: string,
  apiKey?: string
): Promise<SkillThreatLookup> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  validateBaseUrl(baseUrl);

  const response = await fetch(
    `${baseUrl}/api/skill-threats/${encodeURIComponent(skillHash)}`,
    { headers, signal: AbortSignal.timeout(5_000) }
  );

  const result = (await response.json()) as ApiResponse<SkillThreatLookup>;

  if (!result.ok || !result.data) {
    return { found: false, verdict: 'unknown' };
  }

  return result.data;
}
