"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, FileText, Github, CheckCircle2, Loader2, XCircle } from "lucide-react";
import type {
  ZionAuditListItem,
  ZionAuditListResponse,
} from "@/types/zion-audits";

interface RecentAuditsProps {
  limit?: number;
}

function gradeColor(grade: string | null): string {
  if (!grade) return "var(--color-text-tertiary)";
  switch (grade.toUpperCase()) {
    case "A":
      return "var(--color-success)";
    case "B":
      return "#86efac";
    case "C":
      return "var(--color-warning)";
    case "D":
      return "#f97316";
    case "F":
      return "var(--color-danger)";
    default:
      return "var(--color-text-primary)";
  }
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const delta = Math.max(0, (now - then) / 1000);
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  if (delta < 2_592_000) return `${Math.floor(delta / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function describeSource(item: ZionAuditListItem): string {
  if (item.source_type === "github") {
    try {
      const url = item.source_meta?.githubUrl;
      if (!url) return "GitHub";
      const { pathname, hostname } = new URL(url);
      return `${hostname}${pathname}`;
    } catch {
      return "GitHub";
    }
  }
  const names = item.source_meta?.filenames;
  if (Array.isArray(names) && names.length > 0) {
    if (names.length === 1) return names[0];
    return `${names[0]} + ${names.length - 1} more`;
  }
  return "Uploaded files";
}

export function RecentAudits({ limit = 5 }: RecentAuditsProps) {
  const [state, setState] = useState<
    | { state: "loading" }
    | { state: "signed-out" }
    | { state: "empty" }
    | { state: "ready"; items: ZionAuditListItem[] }
    | { state: "error"; message: string }
  >({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/zion/audits?limit=${limit}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.status === 401) {
          setState({ state: "signed-out" });
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setState({
            state: "error",
            message: body.error || `Failed (${res.status})`,
          });
          return;
        }
        const json = (await res.json()) as ZionAuditListResponse;
        if (cancelled) return;
        if (json.audits.length === 0) {
          setState({ state: "empty" });
        } else {
          setState({ state: "ready", items: json.audits });
        }
      } catch {
        if (!cancelled) setState({ state: "error", message: "Network error." });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  // Hide entirely for signed-out visitors — the landing is public, no need
  // to prompt anonymous users to "sign in to see your audits".
  if (state.state === "signed-out") return null;

  return (
    <section className="px-4 space-y-3">
      <div className="mx-auto max-w-5xl flex items-end justify-between gap-3">
        <div>
          <h2
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Your audits
          </h2>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Recent submissions, most recent first.
          </p>
        </div>
        {state.state === "ready" && (
          <Link
            href="/audit/new"
            className="text-xs font-medium"
            style={{ color: "var(--color-primary)" }}
          >
            Start another →
          </Link>
        )}
      </div>

      <div className="mx-auto max-w-5xl">
        {state.state === "loading" && <LoadingSkeleton />}
        {state.state === "empty" && <EmptyState />}
        {state.state === "error" && <ErrorState message={state.message} />}
        {state.state === "ready" && (
          <ul className="space-y-2">
            {state.items.map((item) => (
              <AuditRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AuditRow({ item }: { item: ZionAuditListItem }) {
  const href = item.job_id
    ? `/audit/${encodeURIComponent(item.job_id)}`
    : "/audit";
  const source = describeSource(item);
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-none"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <SourceIcon type={item.source_type} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium truncate"
              style={{ color: "var(--color-text-primary)" }}
              title={source}
            >
              {source}
            </span>
            {item.parent_audit_id && (
              <span
                className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 shrink-0"
                style={{
                  color: "var(--color-primary)",
                  backgroundColor: "var(--color-bg-tertiary)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                resubmit
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-2 text-xs mt-0.5"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              {timeAgo(item.created_at)}
            </span>
            {item.chain && <span>· {item.chain}</span>}
            {item.language && <span>· {item.language}</span>}
          </div>
        </div>
        <StatusBadge status={item.status} />
        {item.grade && (
          <div
            className="flex items-center justify-center text-sm font-bold shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-bg-tertiary)",
              color: gradeColor(item.grade),
            }}
            aria-label={`Grade ${item.grade}`}
          >
            {item.grade}
          </div>
        )}
      </Link>
    </li>
  );
}

function SourceIcon({ type }: { type: ZionAuditListItem["source_type"] }) {
  const Icon = type === "github" ? Github : FileText;
  return (
    <span
      className="flex items-center justify-center shrink-0"
      style={{
        width: 32,
        height: 32,
        backgroundColor: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-md)",
        color: "var(--color-text-secondary)",
      }}
      aria-hidden
    >
      <Icon size={14} />
    </span>
  );
}

function StatusBadge({ status }: { status: ZionAuditListItem["status"] }) {
  const map: Record<
    ZionAuditListItem["status"],
    { label: string; color: string; icon: React.ReactNode }
  > = {
    queued: {
      label: "Queued",
      color: "var(--color-text-muted)",
      icon: <Clock size={11} />,
    },
    running: {
      label: "Running",
      color: "var(--color-primary)",
      icon: <Loader2 size={11} className="animate-spin" />,
    },
    completed: {
      label: "Done",
      color: "var(--color-success)",
      icon: <CheckCircle2 size={11} />,
    },
    failed: {
      label: "Failed",
      color: "var(--color-danger)",
      icon: <XCircle size={11} />,
    },
  };
  const { label, color, icon } = map[status];
  return (
    <span
      className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 shrink-0"
      style={{
        color,
        backgroundColor: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-[60px] animate-pulse"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        />
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-2 py-8"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px dashed var(--color-border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <FileText size={24} style={{ color: "var(--color-text-muted)" }} />
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        No audits yet.
      </p>
      <Link
        href="/audit/new"
        className="text-xs font-medium"
        style={{ color: "var(--color-primary)" }}
      >
        Run your first audit →
      </Link>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="text-sm px-4 py-3"
      style={{
        color: "var(--color-text-secondary)",
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {message}
    </div>
  );
}
