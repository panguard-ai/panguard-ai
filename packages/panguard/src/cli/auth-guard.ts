/**
 * Auth guard — device code flow session management.
 *
 * Two APIs coexist in this module:
 *
 *   1. LEGACY (sync, community-tier stubs) — kept for backward compatibility
 *      with callers that still import `requireAuth`, `withAuth`,
 *      `checkFeatureAccess`, `getLicense`, etc. These remain no-op style because
 *      every feature is free in the Community edition.
 *
 *   2. NEW (async, real session) — used by `pga login` / `pga logout` /
 *      `pga whoami` and by commands that want to attach a Bearer token to
 *      authenticated API calls. See `loadAuth`, `authHeader`, `requireLogin`,
 *      `isAuthenticated`, `authConfigPath`.
 *
 * The two APIs are independent on purpose. Community features never ask for
 * a login; login only unlocks workspace-scoped features (TC verdict cache,
 * report tagging, etc.) and is strictly additive.
 *
 * @module @panguard-ai/panguard/cli/auth-guard
 */

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Tier } from '@panguard-ai/core';
import { loadCredentials } from './credentials.js';
import type { StoredCredentials } from './credentials.js';

// ────────────────────────────────────────────────────────────
// NEW async session API (device-code auth)
// ────────────────────────────────────────────────────────────

/**
 * Shape of `~/.panguard/auth.json`.
 * Created by `pga login`, consumed by any command needing workspace auth.
 */
export interface AuthInfo {
  readonly api_key: string;
  readonly workspace_id: string;
  readonly workspace_slug: string;
  readonly workspace_name: string;
  readonly tier: string;
  readonly user_email: string;
  readonly logged_in_at: string;
}

/** Absolute path to the auth file. */
export function authConfigPath(): string {
  const home = process.env['HOME'] ?? process.env['USERPROFILE'] ?? homedir();
  return join(home, '.panguard', 'auth.json');
}

function isValidAuthInfo(value: unknown): value is AuthInfo {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['api_key'] === 'string' &&
    v['api_key'].length > 0 &&
    typeof v['workspace_id'] === 'string' &&
    typeof v['workspace_slug'] === 'string' &&
    typeof v['workspace_name'] === 'string' &&
    typeof v['tier'] === 'string' &&
    typeof v['user_email'] === 'string' &&
    typeof v['logged_in_at'] === 'string'
  );
}

/**
 * Read and validate `~/.panguard/auth.json`.
 * Returns null if the file does not exist, is unreadable, or malformed.
 * Never throws on normal "not logged in" cases.
 */
export async function loadAuth(): Promise<AuthInfo | null> {
  try {
    const raw = await readFile(authConfigPath(), 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidAuthInfo(parsed)) return null;
    // Return a frozen, defensive copy so callers cannot mutate session state.
    return Object.freeze({
      api_key: parsed.api_key,
      workspace_id: parsed.workspace_id,
      workspace_slug: parsed.workspace_slug,
      workspace_name: parsed.workspace_name,
      tier: parsed.tier,
      user_email: parsed.user_email,
      logged_in_at: parsed.logged_in_at,
    });
  } catch {
    return null;
  }
}

/** Quick existence check. */
export async function isAuthenticated(): Promise<boolean> {
  return (await loadAuth()) !== null;
}

/**
 * Return an `Authorization: Bearer …` header if logged in, else an empty
 * object. Useful for fetch calls that work both anonymously and authenticated.
 */
export async function authHeader(): Promise<Record<string, string>> {
  const auth = await loadAuth();
  if (!auth) return {};
  return { Authorization: `Bearer ${auth.api_key}` };
}

/**
 * Throw if the user is not logged in. Use in commands that require a
 * workspace session (e.g. endpoint registration, TC verdict push).
 * The error message is user-facing and does not leak secrets.
 */
export async function requireLogin(): Promise<AuthInfo> {
  const auth = await loadAuth();
  if (!auth) {
    throw new Error('Not logged in. Run `pga login` to authenticate.');
  }
  return auth;
}

// ────────────────────────────────────────────────────────────
// LEGACY sync API — kept intact for existing callers.
// DO NOT remove without migrating: interactive.ts, ux-helpers.ts,
// commands/{chat,deploy,hacktivity}.ts, interactive/{render,menu-defs,
// actions/scan}.ts.
// ────────────────────────────────────────────────────────────

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
