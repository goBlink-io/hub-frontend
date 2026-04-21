"use client";

import { useEffect } from "react";

/**
 * global-error.tsx is the last-resort error boundary, invoked when the
 * root layout itself throws (very rare). It must render its own <html>
 * and <body> since nothing higher in the tree is guaranteed to have run.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: "#0a0b0f",
          color: "#f1f1f3",
          fontFamily: "system-ui, sans-serif",
          margin: 0,
        }}
      >
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: "28px" }}>
              Something went wrong
            </h1>
            <p style={{ margin: 0, color: "#8b8ca7" }}>
              The application failed to load. Please refresh the page.
            </p>
            {error.digest && (
              <p
                style={{
                  marginTop: 12,
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                  color: "#5e5f7a",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
