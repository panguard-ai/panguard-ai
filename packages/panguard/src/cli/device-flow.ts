/**
 * Device Code Flow primitives — shared by `pga login`.
 *
 * Follows RFC 8628 semantics with PanGuard-specific endpoint names.
 * See `packages/panguard/docs/DEVICE_FLOW.md` for the full protocol.
 *
 * This module is deliberately dependency-free (uses only global `fetch` and
 * `node:*` built-ins) so it can be unit-tested with a mocked fetch.
 *
 * @module @panguard-ai/panguard/cli/device-flow
 */

import { spawn } from 'node:child_process';

/** Default public endpoint; overridden by `--app-url` / `PANGUARD_APP_URL`. */
export const DEFAULT_APP_URL = 'https://app.panguard.ai';

export interface DeviceCodeResponse {
  readonly user_code: string;
  readonly device_code: string;
  readonly verification_uri: string;
  readonly verification_uri_complete: string;
  readonly expires_in: number;
  readonly interval: number;
}

export interface DevicePollSuccess {
  readonly api_key: string;
  readonly workspace: {
    readonly id: string;
    readonly slug: string;
    readonly name: string;
    readonly tier: string;
    /**
     * Optional: matching TC org_id for correlating paid events with anonymous
     * telemetry. Absent if the workspace was provisioned before the TC link
     * migration landed.
     */
    readonly tc_org_id?: string | null;
  };
  readonly user: { readonly email: string };
}

export type PollOutcome =
  | { readonly kind: 'success'; readonly payload: DevicePollSuccess }
  | { readonly kind: 'pending' }
  | { readonly kind: 'slow_down' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'error'; readonly message: string };

/**
 * Resolve the effective app URL from CLI flag + env var + default.
 * CLI flag wins, then env var, then hard-coded default.
 */
export function resolveAppUrl(cliFlag: string | undefined): string {
  if (cliFlag && cliFlag.length > 0) return stripTrailingSlash(cliFlag);
  const env = process.env['PANGUARD_APP_URL'];
  if (env && env.length > 0) return stripTrailingSlash(env);
  return DEFAULT_APP_URL;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * POST `${appUrl}/api/device/code`. Throws on HTTP error or malformed response.
 */
export async function requestDeviceCode(
  appUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<DeviceCodeResponse> {
  const res = await fetchImpl(`${appUrl}/api/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: 'panguard-cli' }),
  });

  if (!res.ok) {
    throw new Error(`Device code request failed (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as Partial<DeviceCodeResponse>;
  if (
    typeof data.user_code !== 'string' ||
    typeof data.device_code !== 'string' ||
    typeof data.verification_uri !== 'string' ||
    typeof data.verification_uri_complete !== 'string' ||
    typeof data.expires_in !== 'number' ||
    typeof data.interval !== 'number'
  ) {
    throw new Error('Invalid device code response from server.');
  }

  return {
    user_code: data.user_code,
    device_code: data.device_code,
    verification_uri: data.verification_uri,
    verification_uri_complete: data.verification_uri_complete,
    expires_in: data.expires_in,
    interval: data.interval,
  };
}

/**
 * POST `${appUrl}/api/device/poll` once. Maps server statuses to a typed
 * outcome so callers don't need to re-parse HTTP details.
 */
export async function pollOnce(
  appUrl: string,
  deviceCode: string,
  fetchImpl: typeof fetch = fetch
): Promise<PollOutcome> {
  let res: Response;
  try {
    res = await fetchImpl(`${appUrl}/api/device/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ device_code: deviceCode }),
    });
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
  }

  if (res.status === 200) {
    const body = (await res.json()) as Partial<DevicePollSuccess>;
    if (
      typeof body.api_key === 'string' &&
      body.workspace &&
      typeof body.workspace.id === 'string' &&
      typeof body.workspace.slug === 'string' &&
      typeof body.workspace.name === 'string' &&
      typeof body.workspace.tier === 'string' &&
      body.user &&
      typeof body.user.email === 'string'
    ) {
      return { kind: 'success', payload: body as DevicePollSuccess };
    }
    return { kind: 'error', message: 'Malformed success response from server.' };
  }

  if (res.status === 428) return { kind: 'pending' };
  if (res.status === 429) return { kind: 'slow_down' };
  if (res.status === 400) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (body.error === 'expired_token') return { kind: 'expired' };
    return { kind: 'error', message: body.error ?? 'Bad request from server.' };
  }

  return { kind: 'error', message: `Unexpected poll status ${res.status}.` };
}

/**
 * Open the user's default browser at `url`. Best-effort; never throws.
 * macOS → `open`, Linux → `xdg-open`, Windows → `start` (via cmd /c).
 */
export function openBrowser(url: string): void {
  try {
    const platform = process.platform;
    if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
      return;
    }
    if (platform === 'win32') {
      // `start` is a cmd builtin, so we have to go through cmd.exe.
      // Empty string as first arg is a quirk of `start` to support quoted URLs.
      spawn('cmd', ['/c', 'start', '""', url], { stdio: 'ignore', detached: true }).unref();
      return;
    }
    // Assume Linux / other UNIX.
    spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
  } catch {
    // Ignore — user can still click the printed URL.
  }
}
