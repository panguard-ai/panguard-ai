/**
 * In-memory rate limiter for API routes.
 * Limits each IP to a configurable number of requests per window.
 * Works on both local dev and Vercel serverless (per-instance).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 5;   // per window per IP

/** Prune expired entries periodically to prevent memory leak */
let lastPrune = Date.now();
function prune() {
  const now = Date.now();
  if (now - lastPrune < WINDOW_MS) return;
  lastPrune = now;
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}

/**
 * Check rate limit for an IP. Returns true if request is allowed.
 */
export function checkRateLimit(ip: string): boolean {
  prune();
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= MAX_REQUESTS;
}

/**
 * Extract client IP from request headers (works with Vercel, Cloudflare, etc.)
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the LAST IP (most trustworthy in proxy chain)
    const ips = forwarded.split(",").map((s) => s.trim());
    return ips[ips.length - 1] || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}
