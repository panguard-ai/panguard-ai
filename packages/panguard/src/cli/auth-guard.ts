/**
 * Auth guard stubs — all features are free and open source.
 * Kept for backward compatibility with modules that import these functions.
 *
 * @module @panguard-ai/panguard/cli/auth-guard
 */

import type { Tier } from '@panguard-ai/core';
import { loadCredentials } from './credentials.js';
import type { StoredCredentials } from './credentials.js';

export type RequiredTier = Tier;

export interface AuthCheckResult {
  authenticated: boolean;
  authorized: boolean;
  credentials: StoredCredentials | null;
}

/** All features are free — always returns authorized. */
export function requireAuth(_requiredTier: RequiredTier = 'community'): AuthCheckResult {
  return { authenticated: true, authorized: true, credentials: null };
}

/** All features are free — runs handler directly. */
export function withAuth<T>(
  _requiredTier: RequiredTier,
  handler: (options: T, credentials: StoredCredentials) => Promise<void>
): (options: T) => Promise<void> {
  return async (options: T) => {
    const creds = loadCredentials();
    const fallback: StoredCredentials = {
      token: '',
      email: '',
      name: 'community',
      tier: 'community' as Tier,
      apiUrl: '',
      savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await handler(options, creds ?? fallback);
  };
}

/** No-op — all features are free. */
export function tierBadge(_tier: RequiredTier): string {
  return '';
}

/** All features are free. */
export function getLicense(): { tier: Tier; email?: string } {
  return { tier: 'community' };
}

/** All features are free — always returns true. */
export function checkAccess(_requiredTier: Tier): boolean {
  return true;
}

/** All features are free — always returns true. */
export function checkFeatureAccess(_feature: string): boolean {
  return true;
}

/** No-op stubs */
export function showUpgradePrompt(_feature: string, _lang?: string): void {}
export function showScanUpgradeHint(_fixableCount: number, _lang?: string): void {}
export function showGuardAIHint(_threatType: string, _confidence: number, _lang?: string): void {}
export function refreshTierInBackground(): void {}

export const FEATURE_TIER: Readonly<Record<string, Tier>> = {};
export const PRICING_TIERS: Record<string, { price: number; unit: string; machines: string }> = {
  community: { price: 0, unit: '', machines: 'unlimited' },
};
export const COMPLIANCE_PRICING: Record<
  string,
  { price: number; unit: string; name: Record<string, string> }
> = {};
export const BUSINESS_REPORT_DISCOUNT = 0;
