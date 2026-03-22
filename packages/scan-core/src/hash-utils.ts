/**
 * Unified hash utilities for scan-core.
 *
 * Both CLI Auditor and Website MUST use these functions to produce
 * identical hashes — this is critical for Threat Cloud consensus.
 */

import { createHash } from 'node:crypto';

/**
 * Content hash: SHA-256 of raw skill content, truncated to 16 hex chars.
 * Used for cache keys, skill deduplication, and TC skill-threat submission.
 */
export function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Pattern hash: SHA-256 of finding signatures, truncated to 16 hex chars.
 * Used for ATR proposal deduplication in Threat Cloud.
 *
 * Input format: `scan:{skillName}:{findingSummary}`
 * - No source prefix (was `web-scan:` before) so CLI + Web produce same hash.
 */
export function patternHash(skillName: string, findingSummary: string): string {
  return createHash('sha256')
    .update(`scan:${skillName}:${findingSummary}`)
    .digest('hex')
    .slice(0, 16);
}
