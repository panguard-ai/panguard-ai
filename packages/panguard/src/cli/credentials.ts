/**
 * Credentials stub — community edition (no auth required).
 * Kept for backward compatibility with modules that import these functions.
 *
 * @module @panguard-ai/panguard/cli/credentials
 */

import type { Tier } from '@panguard-ai/core';

export type { Tier };

export interface StoredCredentials {
  token: string;
  email: string;
  name: string;
  tier: Tier;
  apiUrl: string;
  savedAt: string;
  expiresAt: string;
}

export interface LlmConfig {
  provider: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  savedAt: string;
}

/** Always returns null — no credentials stored in community edition. */
export function loadCredentials(): StoredCredentials | null {
  return null;
}

/** No-op in community edition. */
export function saveCredentials(_creds: StoredCredentials): void {}

/** No-op in community edition. */
export function clearCredentials(): void {}

/** Always returns null — no LLM config stored. */
export function loadLlmConfig(): LlmConfig | null {
  return null;
}

/** No-op in community edition. */
export function saveLlmConfig(_config: LlmConfig): void {}

/** Always returns false in community edition. */
export function deleteLlmConfig(): boolean {
  return false;
}
