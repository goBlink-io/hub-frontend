"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import type {
  AdminAuditDetailResponse,
  AdminAuditRow,
} from "@/types/admin-audits";
import { AuditReport } from "@/components/audit/AuditReport";

interface AdminAuditDetailProps {
  id: string;
  maxBytes: number;
}

export function AdminAuditDetail({ id, maxBytes }: AdminAuditDetailProps) {
  const [state, setState] = useState<
    | { state: "loading" }
    | { state: "error"; message: string }
    | { state: "ready"; audit: AdminAuditRow }
  >({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/audits/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setState({
            state: "error",
            message: body.error || `Failed (${res.status})`,
          });
          return;
        }
        const json = (await res.json()) as AdminAuditDetailResponse;
        if (cancelled) return;
        setState({ state: "ready", audit: json.audit });
      } catch {
        if (!cancelled) setState({ state: "error", message: "Network error." });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-4">
      <Link
        href="/admin/audits"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        All audits
      </Link>

      {state.state === "loading" && (
        <div
          className="flex items-center gap-2 p-6"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            color: "var(--color-text-secondary)",
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading audit…</span>
        </div>
      )}

      {state.state === "error" && (
        <div
          className="flex items-start gap-2 p-4 text-sm"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-danger)",
          }}
        >
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}

      {state.state === "ready" && (
        <>
          <AdminMeta audit={state.audit} />
          {state.audit.result && state.audit.job_id ? (
            <AuditReport
              result={state.audit.result}
              jobId={state.audit.job_id}
              maxBytes={maxBytes}
            />
          ) : (
            <div
              className="text-sm p-5"
              style={{
                color: "var(--color-text-tertiary)",
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px dashed var(--color-border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              No result recorded yet. Status:{" "}
              <span style={{ color: "var(--color-text-primary)" }}>
                {state.audit.status}
              </span>
              {state.audit.error_message && (
                <>
                  {" "}· <em>{state.audit.error_message}</em>
                </>
              )}
              .
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AdminMeta({ audit }: { audit: AdminAuditRow }) {
  return (
    <section
      className="p-5 space-y-3"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        Admin metadata
      </div>
      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <Fact label="Row ID" value={audit.id} mono />
        <Fact label="User ID" value={audit.user_id} mono />
        <Fact label="Audit ID" value={audit.audit_id ?? "—"} mono />
        <Fact label="Job ID" value={audit.job_id ?? "—"} mono />
        <Fact label="Status" value={audit.status} />
        <Fact label="Source" value={audit.source_type} />
        <Fact
          label="Submitted"
          value={new Date(audit.created_at).toLocaleString()}
        />
        <Fact
          label="Completed"
          value={
            audit.completed_at
              ? new Date(audit.completed_at).toLocaleString()
              : "—"
          }
        />
        <Fact
          label="Resubmits"
          value={`${audit.resubmit_count}${
            audit.parent_audit_id ? " (this is a resubmit)" : ""
          }`}
        />
        {audit.parent_audit_id && (
          <Fact label="Parent audit" value={audit.parent_audit_id} mono />
        )}
      </div>
    </section>
  );
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 truncate ${mono ? "font-mono" : ""}`}
        style={{ color: "var(--color-text-primary)" }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
