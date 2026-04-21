"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to stdout (captured by Vercel / container logs) and any
    // future Sentry integration will automatically pick up unhandled
    // errors via its ErrorBoundary. Keep console.error as baseline.
    console.error("[app error]", error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      style={{ color: "var(--color-text-primary)" }}
    >
      <div
        className="mb-6 flex h-14 w-14 items-center justify-center"
        style={{
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderRadius: "var(--radius-xl)",
          color: "var(--color-danger)",
        }}
      >
        <AlertTriangle size={26} />
      </div>
      <h1 className="mb-2 text-3xl font-bold">Something went wrong</h1>
      <p
        className="mb-2 max-w-md text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        An unexpected error interrupted your request. Our team has been
        notified.
      </p>
      {error.digest && (
        <p
          className="mb-8 font-mono text-xs"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 h-11 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
          }}
        >
          <RefreshCw size={14} />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 h-11 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-bg-tertiary)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
