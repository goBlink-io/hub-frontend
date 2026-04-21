/**
 * In-memory fixed-window rate limiter.
 *
 * Per-process only — counters reset on cold start and do not share across
 * serverless instances. For cross-instance limiting, swap for Upstash/Redis.
 * Treat this as defence-in-depth on top of upstream limits, not a SLA.
 */

export interface RateLimiter {
  /** Returns `{ limited: true, retryAfterSec }` if over the cap, else `{ limited: false }`. */
  check(key: string): { limited: false } | { limited: true; retryAfterSec: number };
  /** Current count for a key (for diagnostics). */
  peek(key: string): number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Maximum hits allowed within the window. */
  max: number;
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const { windowMs, max } = opts;
  const buckets = new Map<string, Bucket>();

  return {
    check(key) {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || now >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { limited: false };
      }
      bucket.count++;
      if (bucket.count > max) {
        return {
          limited: true,
          retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        };
      }
      return { limited: false };
    },
    peek(key) {
      const bucket = buckets.get(key);
      if (!bucket || Date.now() >= bucket.resetAt) return 0;
      return bucket.count;
    },
  };
}

/**
 * Extract a client IP from request headers.
 * Duplicated from `lib/server/audit.ts` to keep this module dependency-free.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
