"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCw } from "lucide-react";
import { useAuditJob } from "@/hooks/useAuditJob";
import { AuditProgress } from "./AuditProgress";
import { AuditReport } from "./AuditReport";

interface AuditJobViewProps {
  jobId: string;
  maxBytes: number;
}

export function AuditJobView({ jobId, maxBytes }: AuditJobViewProps) {
  const { state, status, error, retrying, refetch } = useAuditJob(jobId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/audit"
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <ArrowLeft size={14} />
          Back to Audit
        </Link>
        <span
          className="text-xs font-mono"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {jobId}
        </span>
      </div>

      {state === "loading" && <AuditProgress retrying={false} />}

      {state === "pending" && <AuditProgress status={status} retrying={retrying} />}

      {state === "completed" && status?.status === "completed" && (
        <AuditReport result={status.result} jobId={jobId} maxBytes={maxBytes} />
      )}

      {state === "failed" && status?.status === "failed" && (
        <FailedCard message={status.error.message} onRetry={refetch} />
      )}

      {state === "error" && (
        <ErrorCard message={error ?? "Unknown error"} onRetry={refetch} />
      )}
    </div>
  );
}

function FailedCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section
      className="space-y-4 p-6"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} style={{ color: "var(--color-danger)" }} />
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Audit failed
        </h2>
      </div>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {message}
      </p>
      <div className="flex gap-2">
        <Link
          href="/audit/new"
          className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
          }}
        >
          Start a new audit
        </Link>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-bg-tertiary)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <RotateCw size={14} />
          Retry fetch
        </button>
      </div>
    </section>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section
      className="flex items-center justify-between gap-3 p-4"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {message}
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--color-primary)" }}
      >
        <RotateCw size={14} />
        Retry
      </button>
    </section>
  );
}
