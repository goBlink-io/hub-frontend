/**
 * Error reporting shim.
 *
 * Today: structured JSON to stdout — Vercel / container logs capture
 * this and downstream log pipelines (Axiom, Datadog, BetterStack) can
 * parse it.
 *
 * When adopting Sentry (or any APM), wire it in here. The rest of the
 * codebase imports `reportError()` — nothing else changes.
 *
 *   // Example Sentry integration:
 *   import * as Sentry from "@sentry/nextjs";
 *   Sentry.captureException(err, { extra: safeContext, tags: { digest } });
 */

const REDACT_KEYS = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "service_role_key",
  "session_secret",
  "jwt_secret",
  "password",
  "secret",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth-limit]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

export interface ErrorContext {
  /** Next.js error boundary digest — correlates server + client. */
  digest?: string;
  /** Request correlation ID, if the middleware set one. */
  requestId?: string;
  /** Authenticated user, if available. */
  userId?: string;
  /** Anything else the caller wants to attach. */
  [k: string]: unknown;
}

export function reportError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const safeContext = context ? (redact(context) as ErrorContext) : undefined;

  // Sentry hook point — see top-of-file docstring for migration.

  // Structured log for now.
  console.error(
    JSON.stringify({
      type: "ERROR",
      name: err.name,
      message: err.message,
      stack: err.stack,
      context: safeContext,
      timestamp: new Date().toISOString(),
    }),
  );
}
