/**
 * Error reporting shim.
 *
 * - Structured JSON to stdout (always) — Vercel / container logs capture
 *   this and downstream log pipelines (Axiom, Datadog, BetterStack) can
 *   parse it.
 *
 * - Sentry (optional) — if `SENTRY_DSN` is set AND `@sentry/nextjs` is
 *   installed, errors are also forwarded via `Sentry.captureException()`.
 *   The dependency is loaded lazily on first use so the module is a
 *   true no-op when Sentry isn't wanted, and so the package only has to
 *   be installed by deployments that actually enable it.
 *
 *   To enable in a deployment:
 *     1. `pnpm add @sentry/nextjs`
 *     2. Set SENTRY_DSN in the environment.
 *     3. (Optional) SENTRY_ENVIRONMENT, SENTRY_RELEASE for better tagging.
 *
 *   For the full experience (source-map upload, tracing, session replay,
 *   automatic browser init), run `npx @sentry/wizard -i nextjs` — that
 *   adds sentry.*.config.ts files and wraps next.config.ts. This seam
 *   still works alongside wizard output: the dynamic import just finds
 *   the already-initialized Sentry SDK.
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

// ── Sentry bridge ─────────────────────────────────────────────────────────

interface SentryBridge {
  captureException(
    err: unknown,
    hint?: { extra?: Record<string, unknown>; tags?: Record<string, string> },
  ): void;
  init?(options: { dsn: string; environment?: string; release?: string }): void;
}

let sentryPromise: Promise<SentryBridge | null> | null = null;

function loadSentry(): Promise<SentryBridge | null> {
  // Cache the resolution (including `null`) so each call site pays the
  // lookup cost at most once.
  if (sentryPromise) return sentryPromise;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    sentryPromise = Promise.resolve(null);
    return sentryPromise;
  }

  sentryPromise = (async () => {
    try {
      // Variable-indirected spec + webpackIgnore + Function-constructor
      // import all combine to keep this a *runtime* lookup. TypeScript
      // doesn't try to type-check against an uninstalled module, and
      // bundlers don't try to include it in the graph.
      const spec = "@sentry/nextjs";
      const dynamicImport = new Function("s", "return import(s)") as (
        s: string,
      ) => Promise<unknown>;
      const mod = (await dynamicImport(spec)) as SentryBridge;
      // If @sentry/wizard installed config files, Sentry is already
      // initialized by the time any route runs and `.init()` here is
      // a noop. If the user is doing the minimal integration, we
      // initialize on first use.
      if (typeof mod.init === "function") {
        mod.init({
          dsn,
          environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
          release: process.env.SENTRY_RELEASE,
        });
      }
      return mod;
    } catch {
      // Package not installed — treat as disabled. Don't warn on every
      // error; one stdout line is enough.
      if (typeof process !== "undefined" && !process.env._SENTRY_WARNED) {
        console.warn(
          "[error-reporting] SENTRY_DSN is set but @sentry/nextjs is not installed. " +
            "Run `pnpm add @sentry/nextjs` to enable.",
        );
        process.env._SENTRY_WARNED = "1";
      }
      return null;
    }
  })();

  return sentryPromise;
}

export function reportError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const safeContext = context ? (redact(context) as ErrorContext) : undefined;

  // Structured log — always. Runs synchronously so logs never depend on
  // the Sentry dynamic import resolving.
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

  // Sentry — fire-and-forget. We don't block on this. Failures here
  // must not cascade back to the caller.
  loadSentry()
    .then((sentry) => {
      if (!sentry) return;
      const tags: Record<string, string> = {};
      if (safeContext?.digest) tags.digest = String(safeContext.digest);
      if (safeContext?.requestId) tags.requestId = String(safeContext.requestId);
      sentry.captureException(err, {
        extra: safeContext as Record<string, unknown> | undefined,
        tags,
      });
    })
    .catch(() => {
      // Ignore — log pipeline already has the error.
    });
}
