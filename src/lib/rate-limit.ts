/**
 * Simple in-memory rate limiter for API routes.
 * Not shared across Vercel serverless instances — provides per-instance throttling.
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 60s
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store) {
      if (val.resetAt < now) store.delete(key);
    }
  }, 60_000);
}

export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export function isRateLimited(
  identifier: string,
  config: RateLimitConfig = { max: 30, windowMs: 60_000 }
): boolean {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + config.windowMs });
    return false;
  }

  entry.count++;
  return entry.count > config.max;
}

export function getClientIp(req: Request): string {
  const forwarded = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim();
  return forwarded || 'unknown';
}
