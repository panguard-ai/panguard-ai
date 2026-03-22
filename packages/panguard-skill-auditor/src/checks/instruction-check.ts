/**
 * Prompt injection and tool poisoning detection - delegates to @panguard-ai/scan-core
 */

import { checkInstructions as coreCheckInstructions } from '@panguard-ai/scan-core';
import type { CheckResult } from '../types.js';

/**
 * Check instructions for prompt injection and tool poisoning patterns.
 *
 * @param instructions - The full text content to scan
 * @param sourceType - Context hint: 'skill' (SKILL.md, default) or 'documentation'
 */
export function checkInstructions(
  instructions: string,
  sourceType: 'skill' | 'documentation' = 'skill'
): CheckResult {
  const result = coreCheckInstructions(instructions, sourceType);
  return {
    status: result.status,
    label: result.label,
    findings: result.findings,
  };
}
