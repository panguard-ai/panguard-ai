/**
 * Outbound URL SSRF guard.
 *
 * Shared validation for every place Guard makes an outbound HTTP request from
 * a value that could be attacker-influenced (telemetry endpoint, Threat Cloud
 * endpoint, key-provisioner endpoint, user-configured webhook). Requires https:
 * (http allowed ONLY for loopback when explicitly opted in) and rejects
 * private / reserved / link-local / loopback / cloud-metadata addresses,
 * including IPv4-mapped IPv6 (::ffff:a.b.c.d), IPv6 ULA / link-local, and the
 * well-known cloud-metadata DNS names (metadata.google.internal, etc.).
 *
 * The static checks here block literal-IP and the common metadata-hostname SSRF
 * targets with no DNS. An ARBITRARY hostname that RESOLVES to a private IP
 * (DNS-name SSRF / DNS-rebinding) cannot be caught statically — for that, use
 * `safeLookup` below as the http/https request `lookup` option so resolution is
 * validated at connect time.
 *
 * @module @panguard-ai/panguard-guard/net/validate-outbound-url
 */

import { lookup as dnsLookup } from 'node:dns';
import type { LookupFunction } from 'node:net';

/** Private / reserved / loopback / metadata ranges (literal-IP SSRF guard). */
const PRIVATE_HOST_PATTERNS: readonly RegExp[] = [
  /^localhost$/i,
  /^127\./, // IPv4 loopback
  /^10\./, // RFC 1918 Class A
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC 1918 Class B
  /^192\.168\./, // RFC 1918 Class C
  /^169\.254\./, // IPv4 link-local (incl. 169.254.169.254 metadata)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT (RFC 6598)
  /^0\./, // "This" network
  /^198\.1[89]\./, // Benchmarking (RFC 2544)
  /^::1$/, // IPv6 loopback
  /^::$/, // IPv6 unspecified
  /^fc[0-9a-f]{2}:/i, // IPv6 ULA fc00::/8
  /^fd[0-9a-f]{2}:/i, // IPv6 ULA fd00::/8
  /^fe80:/i, // IPv6 link-local
  /^::ffff:/i, // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  // Cloud-metadata DNS names that resolve to 169.254.169.254 / fd00:ec2::254.
  // A static IP denylist misses these header-free aliases, so match them by
  // exact hostname. (DNS-rebinding to an arbitrary name that resolves to a
  // private IP is still out of scope for a static check — see module doc.)
  /^metadata\.google\.internal$/i, // GCP
  /^metadata\.goog$/i, // GCP (short alias)
  /^metadata$/i, // GCP bare hostname (resolves inside GCE)
  /^metadata\.tencentyun\.com$/i, // Tencent Cloud
];

export interface OutboundUrlOptions {
  /** Allow plain http: but only when the host is loopback (dev/testing). */
  readonly allowLoopback?: boolean;
}

/**
 * Strip an IPv6 bracket wrapper and zone id so the host can be range-matched.
 * `[::1]` -> `::1`, `[fe80::1%eth0]` -> `fe80::1`.
 */
function normalizeHost(hostname: string): string {
  let host = hostname;
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }
  const zone = host.indexOf('%');
  if (zone !== -1) {
    host = host.slice(0, zone);
  }
  return host;
}

function isLoopbackHost(host: string): boolean {
  return /^localhost$/i.test(host) || /^127\./.test(host) || host === '::1';
}

/**
 * Validate an outbound URL for SSRF safety.
 * Returns null when safe, or a human-readable rejection reason when unsafe.
 */
export function checkOutboundUrl(urlStr: string, options: OutboundUrlOptions = {}): string | null {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return 'Invalid URL format';
  }

  const host = normalizeHost(parsed.hostname);

  if (parsed.protocol === 'http:') {
    if (!(options.allowLoopback && isLoopbackHost(host))) {
      return `Scheme "http:" not allowed (https required${options.allowLoopback ? '; http allowed only for loopback' : ''})`;
    }
  } else if (parsed.protocol !== 'https:') {
    return `Scheme "${parsed.protocol}" not allowed (only https)`;
  }

  for (const pattern of PRIVATE_HOST_PATTERNS) {
    if (pattern.test(host)) {
      return `Host "${host}" is in a private/reserved/loopback range`;
    }
  }

  return null;
}

/** True when the URL is safe to fetch outbound. */
export function isSafeOutboundUrl(url: string, options: OutboundUrlOptions = {}): boolean {
  return checkOutboundUrl(url, options) === null;
}

/**
 * Assert an outbound URL is SSRF-safe, throwing with the reason if not.
 * Use this immediately before issuing the request.
 */
export function assertSafeOutboundUrl(url: string, options: OutboundUrlOptions = {}): void {
  const reason = checkOutboundUrl(url, options);
  if (reason !== null) {
    throw new Error(`Unsafe outbound URL rejected: ${reason} (${url})`);
  }
}

/** True when a RESOLVED IP literal is loopback (127.0.0.0/8 or ::1). */
function isLoopbackAddress(ip: string): boolean {
  const host = normalizeHost(ip);
  return /^127\./.test(host) || host === '::1';
}

/** True when a RESOLVED IP literal falls in a private/reserved/loopback range. */
export function isPrivateAddress(ip: string): boolean {
  const host = normalizeHost(ip);
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

/**
 * Build a dns.lookup drop-in for the http/https request `lookup` option: it
 * resolves the hostname and REFUSES the connection if ANY resolved address is
 * private — closing the DNS-rebinding / DNS-name-SSRF window that a static URL
 * check (checkOutboundUrl) cannot see. Validation happens at connect time, so a
 * name that passed the static check but resolves to 169.254.169.254 / 10.x is
 * still blocked. Pair the two: static check up front, this at the socket.
 *
 * `allowLoopback` mirrors checkOutboundUrl's option so a caller that already
 * permits loopback statically (e.g. a dev endpoint) is not broken by the socket
 * check resolving 127.0.0.1 / ::1.
 */
export function createSafeLookup(options: { allowLoopback?: boolean } = {}): LookupFunction {
  const isBlocked = (ip: string): boolean => {
    if (options.allowLoopback && isLoopbackAddress(ip)) return false;
    return isPrivateAddress(ip);
  };
  return ((
    hostname: string,
    lookupOptions: unknown,
    callback: (err: NodeJS.ErrnoException | null, address?: unknown, family?: number) => void
  ): void => {
    const cb = (typeof lookupOptions === 'function' ? lookupOptions : callback) as (
      err: NodeJS.ErrnoException | null,
      address?: unknown,
      family?: number
    ) => void;
    const opts = (typeof lookupOptions === 'function' ? {} : (lookupOptions ?? {})) as {
      all?: boolean;
      family?: number;
      hints?: number;
    };
    dnsLookup(hostname, { ...opts, all: true }, (err, addresses) => {
      if (err) {
        cb(err);
        return;
      }
      const blocked = addresses.find((a) => isBlocked(a.address));
      if (blocked) {
        const e: NodeJS.ErrnoException = new Error(
          `Blocked DNS resolution: ${hostname} resolves to private address ${blocked.address}`
        );
        e.code = 'ESSRFBLOCKED';
        cb(e);
        return;
      }
      if (opts.all) {
        cb(null, addresses);
        return;
      }
      const first = addresses[0];
      if (!first) {
        const e: NodeJS.ErrnoException = new Error(`No addresses resolved for ${hostname}`);
        e.code = 'ENOTFOUND';
        cb(e);
        return;
      }
      cb(null, first.address, first.family);
    });
  }) as LookupFunction;
}

/** Strict default: blocks any private/reserved/loopback resolution. */
export const safeLookup: LookupFunction = createSafeLookup();
