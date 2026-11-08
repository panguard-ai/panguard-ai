/**
 * Local de-identification for ATR rule proposals that may be posted publicly.
 *
 * A proposal sent through the GitHub issue outlet becomes a PUBLIC issue on the
 * ATR repository. Everything in it must be safe to publish, so before any text
 * leaves the machine we remove, on top of the secret classes scrubSecretValues
 * already masks: home-directory paths, the local user name, the host name,
 * email addresses, IP addresses (loopback and unspecified addresses are kept,
 * they identify nobody and often matter to the attack), and token-shaped strings
 * (JWTs, long hex, long base64-like runs). When in doubt a string is masked:
 * a payload that loses some detail is better than one that names its reporter.
 *
 * @module @panguard-ai/panguard-guard/proposals/deidentify
 */

import { homedir, hostname, userInfo } from 'node:os';
import { scrubSecretValues } from '../agent/scrub-secrets.js';

export const MASK = {
  user: '[user]',
  host: '[host]',
  email: '[email]',
  ip: '[ip]',
  token: '[token]',
} as const;

/** Values specific to the machine the proposal was produced on. */
export interface DeidentifyContext {
  readonly homeDir?: string;
  readonly userName?: string;
  readonly hostName?: string;
}

/**
 * Account names too generic to identify anyone. Replacing them everywhere would
 * mangle ordinary words in a payload ("the user", "run as root") for no gain.
 */
const GENERIC_NAMES: ReadonlySet<string> = new Set([
  'user',
  'users',
  'admin',
  'root',
  'ubuntu',
  'runner',
  'test',
  'guest',
  'node',
  'app',
]);

const KEPT_IPS: ReadonlySet<string> = new Set(['127.0.0.1', '0.0.0.0', '::1', '::']);

const HOME_PATH_PATTERNS: readonly RegExp[] = [
  /\/Users\/[^/\s'"`]+/g,
  /\/home\/[^/\s'"`]+/g,
  /[A-Za-z]:\\Users\\[^\\\s'"`]+/g,
];
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6_PATTERN = /\b(?:[0-9A-Fa-f]{1,4}:){2,7}[0-9A-Fa-f]{1,4}\b/g;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]+/g;
const LONG_HEX_PATTERN = /\b[0-9a-fA-F]{32,}\b/g;
const LONG_OPAQUE_PATTERN = /[A-Za-z0-9+/_-]{40,}={0,2}/g;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safe<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/** The identifying values of the current machine. */
export function localContext(): DeidentifyContext {
  return {
    homeDir: safe(() => homedir()),
    userName: safe(() => userInfo().username),
    hostName: safe(() => hostname()),
  };
}

function replaceLiteral(text: string, literal: string | undefined, mask: string): string {
  if (!literal || literal.length < 3) return text;
  return text.replace(new RegExp(escapeRegExp(literal), 'g'), mask);
}

function replaceName(text: string, name: string | undefined, mask: string): string {
  if (!name || name.length < 3 || GENERIC_NAMES.has(name.toLowerCase())) return text;
  return text.replace(new RegExp(`(?<![\\w.-])${escapeRegExp(name)}(?![\\w-])`, 'gi'), mask);
}

/** Opaque runs that are words joined by separators (paths, slugs) are not tokens. */
function looksLikeToken(run: string): boolean {
  if (/^[a-z]+(?:[-_/][a-z]+)*$/i.test(run)) return false;
  return /\d/.test(run) && /[A-Za-z]/.test(run);
}

/** A path segment long and mixed enough to be a credential rather than a name. */
function segmentLooksLikeToken(segment: string): boolean {
  return (
    segment.length >= 20 &&
    looksLikeToken(segment) &&
    /[a-z]/.test(segment) &&
    /[A-Z]/.test(segment)
  );
}

/**
 * Mask a long opaque run. An absolute path ("/tmp/x/scripts/run") is a run of
 * this alphabet too, and masking it whole turned "scripts/run.py" into
 * "[token].py"; keep its segments and mask only segments that look like tokens.
 */
function maskOpaqueRun(run: string): string {
  const segments = run.split('/');
  if (run.startsWith('/') && segments.filter(Boolean).length >= 3) {
    return segments.map((seg) => (segmentLooksLikeToken(seg) ? MASK.token : seg)).join('/');
  }
  return looksLikeToken(run) ? MASK.token : run;
}

/** Return `input` with every identifying or secret-looking substring masked. */
export function deidentifyText(input: string, ctx: DeidentifyContext = localContext()): string {
  let out = scrubSecretValues(input);
  out = replaceLiteral(out, ctx.homeDir, '~');
  for (const re of HOME_PATH_PATTERNS) out = out.replace(re, '~');
  out = out.replace(EMAIL_PATTERN, MASK.email);
  const host = ctx.hostName?.replace(/\.local$/i, '');
  out = replaceName(out, ctx.hostName, MASK.host);
  out = replaceName(out, host, MASK.host);
  out = replaceName(out, ctx.userName, MASK.user);
  out = out.replace(JWT_PATTERN, MASK.token);
  out = out.replace(IPV4_PATTERN, (ip) => (KEPT_IPS.has(ip) ? ip : MASK.ip));
  // A run of digit-only groups ("12:30:45") is a clock time, not an address.
  out = out.replace(IPV6_PATTERN, (ip) =>
    KEPT_IPS.has(ip) || !/[A-Fa-f]/.test(ip) ? ip : MASK.ip
  );
  out = out.replace(LONG_HEX_PATTERN, MASK.token);
  out = out.replace(LONG_OPAQUE_PATTERN, maskOpaqueRun);
  return out;
}
