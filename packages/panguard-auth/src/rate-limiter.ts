/**
 * In-memory sliding-window rate limiter
 * 記憶體內滑動視窗速率限制器
 *
 * Zero external dependencies. Uses a Map with automatic cleanup.
 *
 * @module @openclaw/panguard-auth/rate-limiter
 */

/** Rate limiter configuration */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  readonly windowMs: number;
  /** Maximum requests allowed within the window */
  readonly maxRequests: number;
}

/** Result of a rate limit check */
export interface RateLimitResult {
  readonly allowed: boolean;
  /** Milliseconds until the window resets (0 if allowed) */
  readonly retryAfterMs: number;
  /** Remaining requests in the current window */
  readonly remaining: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Sliding-window rate limiter backed by an in-memory Map.
 *
 * Automatically cleans up expired buckets every 5 minutes.
 * Call `destroy()` when the limiter is no longer needed.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(private readonly config: RateLimitConfig) {
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  /**
   * Check whether a request from `key` is allowed.
   *
   * @param key - Identifier (typically IP address or IP+email)
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    // New bucket or expired window
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.config.windowMs });
      return { allowed: true, retryAfterMs: 0, remaining: this.config.maxRequests - 1 };
    }

    // Within window but under limit
    if (bucket.count < this.config.maxRequests) {
      bucket.count++;
      return { allowed: true, retryAfterMs: 0, remaining: this.config.maxRequests - bucket.count };
    }

    // Over limit
    return {
      allowed: false,
      retryAfterMs: bucket.resetAt - now,
      remaining: 0,
    };
  }

  /** Remove expired buckets to prevent memory growth */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
  }

  /** Stop the cleanup timer */
  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.buckets.clear();
  }
}
