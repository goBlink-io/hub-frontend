"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { JobStatus } from "@/types/audit";

interface AuditProgressProps {
  status?: JobStatus;
  retrying: boolean;
}

const REASSURING_MESSAGES = [
  "Parsing your contract…",
  "Matching against DeFi patterns…",
  "Generating formal specifications…",
  "Running verifier backends…",
  "Cross-referencing exploit database…",
  "Scoring findings…",
  "Assembling the report…",
];

export function AuditProgress({ status, retrying }: AuditProgressProps) {
  const [messageIdx, setMessageIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIdx((i) => (i + 1) % REASSURING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const proverMessage =
    status && "progress" in status && typeof status.progress === "string"
      ? status.progress
      : null;
  const queuePosition =
    status && "queuePosition" in status && typeof status.queuePosition === "number"
      ? status.queuePosition
      : null;
  const label =
    status?.status === "queued"
      ? "Queued"
      : status?.status === "running"
        ? "Running"
        : "Submitting";

  return (
    <section
      className="mx-auto max-w-2xl space-y-5 p-6"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="flex items-center gap-3">
        <Loader2
          size={20}
          className="animate-spin"
          style={{ color: "var(--color-primary)" }}
        />
        <div>
          <div
            className="text-sm font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {label}
          </div>
          <div
            className="text-xs"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {proverMessage ?? REASSURING_MESSAGES[messageIdx]}
          </div>
        </div>
      </div>

      {queuePosition !== null && queuePosition > 0 && (
        <div
          className="text-xs px-3 py-2"
          style={{
            color: "var(--color-text-secondary)",
            backgroundColor: "var(--color-bg-tertiary)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Queue position: {queuePosition}
        </div>
      )}

      <div
        className="h-1 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-bg-tertiary)" }}
      >
        <div
          className="h-full animate-pulse"
          style={{
            width: "60%",
            backgroundColor: "var(--color-primary)",
            opacity: 0.6,
          }}
        />
      </div>

      {retrying && (
        <div
          className="text-xs"
          style={{ color: "var(--color-warning)" }}
        >
          Reconnecting…
        </div>
      )}

      <p
        className="text-xs"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Audits typically take 2&ndash;20 minutes. You can leave this page open —
        we&apos;ll keep checking in the background.
      </p>
    </section>
  );
}
