/**
 * Outbound URL SSRF guard.
 *
 * Shared validation for every place Guard makes an outbound HTTP request from
 * a value that could be attacker-influenced (telemetry endpoint, Threat Cloud
 * endpoint, key-provisioner endpoint, user-configured webhook). Requires https:
 * (http allowed ONLY for loopback when explicitly opted in) and rejects
 * private / reserved / link-local / loopback / cloud-metadata addresses,
 * including IPv4-mapped IPv6 (::ffff:a.b.c.d) and IPv6 ULA / link-local.
 *
 * Dependency-free by design (no DNS resolution): this blocks literal-IP and
 * obvious-hostname SSRF targets. DNS-rebinding is out of scope for a static
 * URL check and must be handled at the socket layer if ever needed.
 *
 * @module @panguard-ai/panguard-guard/net/validate-outbound-url
 */

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
