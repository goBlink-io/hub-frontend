/**
 * Error reporting utility.
 * TODO: Replace with Sentry or similar in production.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(JSON.stringify({
    type: 'ERROR',
    message: err.message,
    stack: err.stack,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}
