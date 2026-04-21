"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Github,
  Loader2,
  XCircle,
} from "lucide-react";
import type {
  AdminAuditListItem,
  AdminAuditListResponse,
} from "@/types/admin-audits";

type StatusFilter = "" | "queued" | "running" | "completed" | "failed";
type SourceFilter = "" | "upload" | "github";

interface State {
  loading: boolean;
  error: string | null;
  items: AdminAuditListItem[];
  total: number;
}

const PAGE_SIZE = 50;

export function AdminAuditsTable() {
  const [status, setStatusRaw] = useState<StatusFilter>("");
  const [source, setSourceRaw] = useState<SourceFilter>("");
  const [userId, setUserId] = useState("");
  const [userIdDebounced, setUserIdDebounced] = useState("");
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    items: [],
    total: 0,
  });

  // Reset pagination whenever a filter changes — inline in the handler so
  // we don't trigger a setState from within an effect.
  const setStatus = (v: StatusFilter) => {
    setOffset(0);
    setStatusRaw(v);
  };
  const setSource = (v: SourceFilter) => {
    setOffset(0);
    setSourceRaw(v);
  };
  const onUserIdInput = (v: string) => {
    setOffset(0);
    setUserId(v);
  };

  // Debounce the user_id filter so we don't refire a fetch on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setUserIdDebounced(userId.trim()), 300);
    return () => clearTimeout(id);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));
        if (status) params.set("status", status);
        if (source) params.set("source", source);
        if (userIdDebounced) params.set("user", userIdDebounced);

        const res = await fetch(`/api/admin/audits?${params.toString()}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setState({
            loading: false,
            error: body.error || `Failed (${res.status})`,
            items: [],
            total: 0,
          });
          return;
        }
        const json = (await res.json()) as AdminAuditListResponse;
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          items: json.audits,
          total: json.total,
        });
      } catch {
        if (!cancelled) {
          setState({
            loading: false,
            error: "Network error.",
            items: [],
            total: 0,
          });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [status, source, userIdDebounced, offset]);

  const pageInfo = useMemo(() => {
    const from = state.total === 0 ? 0 : offset + 1;
    const to = Math.min(offset + PAGE_SIZE, state.total);
    return { from, to };
  }, [offset, state.total]);

  return (
    <section className="space-y-4">
      <Filters
        status={status}
        onStatus={setStatus}
        source={source}
        onSource={setSource}
        userId={userId}
        onUserId={onUserIdInput}
      />

      {state.error && (
        <div
          className="text-sm px-4 py-3"
          style={{
            color: "var(--color-danger)",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {state.error}
        </div>
      )}

      <div
        className="overflow-hidden"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left"
              style={{
                color: "var(--color-text-muted)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <Th className="w-10" />
              <Th>Submitted</Th>
              <Th>User</Th>
              <Th>Source</Th>
              <Th>Status</Th>
              <Th>Score</Th>
              <Th>Grade</Th>
              <Th>Chain</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {state.loading &&
              Array(6)
                .fill(null)
                .map((_, i) => (
                  <tr
                    key={i}
                    style={{ borderTop: "1px solid var(--color-border)" }}
                  >
                    <td colSpan={9}>
                      <div
                        className="h-11 mx-4 my-2 animate-pulse"
                        style={{
                          backgroundColor: "var(--color-bg-tertiary)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      />
                    </td>
                  </tr>
                ))}
            {!state.loading && state.items.length === 0 && !state.error && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center text-sm py-10"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  No audits match these filters.
                </td>
              </tr>
            )}
            {!state.loading &&
              state.items.map((item) => <AuditRow key={item.id} item={item} />)}
          </tbody>
        </table>
      </div>

      <Pagination
        offset={offset}
        pageSize={PAGE_SIZE}
        total={state.total}
        from={pageInfo.from}
        to={pageInfo.to}
        onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
        onNext={() =>
          setOffset((o) =>
            o + PAGE_SIZE >= state.total ? o : o + PAGE_SIZE,
          )
        }
      />
    </section>
  );
}

function Filters({
  status,
  onStatus,
  source,
  onSource,
  userId,
  onUserId,
}: {
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  source: SourceFilter;
  onSource: (v: SourceFilter) => void;
  userId: string;
  onUserId: (v: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <FilterSelect
        label="Status"
        value={status}
        onChange={(v) => onStatus(v as StatusFilter)}
        options={[
          { v: "", label: "Any" },
          { v: "queued", label: "Queued" },
          { v: "running", label: "Running" },
          { v: "completed", label: "Completed" },
          { v: "failed", label: "Failed" },
        ]}
      />
      <FilterSelect
        label="Source"
        value={source}
        onChange={(v) => onSource(v as SourceFilter)}
        options={[
          { v: "", label: "Any" },
          { v: "upload", label: "Upload" },
          { v: "github", label: "GitHub" },
        ]}
      />
      <div className="sm:col-span-2 space-y-1.5">
        <label
          htmlFor="userFilter"
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          User ID
        </label>
        <input
          id="userFilter"
          type="text"
          placeholder="UUID of user"
          value={userId}
          onChange={(e) => onUserId(e.target.value)}
          className="w-full h-10 px-3 text-sm font-mono"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ v: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 text-sm"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-primary)",
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-[10px] uppercase tracking-wider font-semibold px-3 py-2 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function AuditRow({ item }: { item: AdminAuditListItem }) {
  const Icon = item.source_type === "github" ? Github : FileText;
  return (
    <tr
      style={{ borderTop: "1px solid var(--color-border)" }}
      className="transition-colors"
    >
      <td className="px-3 py-2">
        <Icon size={14} style={{ color: "var(--color-text-secondary)" }} />
      </td>
      <td
        className="px-3 py-2 text-xs whitespace-nowrap"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {new Date(item.created_at).toLocaleString()}
      </td>
      <td className="px-3 py-2">
        <span
          className="text-xs font-mono"
          style={{ color: "var(--color-text-tertiary)" }}
          title={item.user_id}
        >
          {item.user_id.slice(0, 8)}…
        </span>
      </td>
      <td className="px-3 py-2">
        <SourceCell item={item} />
      </td>
      <td className="px-3 py-2">
        <StatusPill status={item.status} />
      </td>
      <td
        className="px-3 py-2 text-xs font-mono"
        style={{ color: "var(--color-text-primary)" }}
      >
        {item.security_score ?? "—"}
      </td>
      <td className="px-3 py-2 text-sm font-bold">
        <span style={{ color: gradeColor(item.grade) }}>
          {item.grade ?? "—"}
        </span>
      </td>
      <td
        className="px-3 py-2 text-xs"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        {item.chain ? `${item.chain}/${item.language ?? "?"}` : "—"}
      </td>
      <td className="px-3 py-2 text-right">
        <Link
          href={`/admin/audits/${encodeURIComponent(item.id)}`}
          className="text-xs font-medium"
          style={{ color: "var(--color-primary)" }}
        >
          View →
        </Link>
      </td>
    </tr>
  );
}

function SourceCell({ item }: { item: AdminAuditListItem }) {
  let summary = "—";
  if (item.source_type === "github" && item.source_meta?.githubUrl) {
    try {
      const { pathname, hostname } = new URL(item.source_meta.githubUrl);
      summary = `${hostname}${pathname}`;
    } catch {
      summary = item.source_meta.githubUrl;
    }
  } else if (item.source_type === "upload") {
    const names = item.source_meta?.filenames;
    if (Array.isArray(names) && names.length > 0) {
      summary =
        names.length === 1 ? names[0] : `${names[0]} + ${names.length - 1}`;
    } else {
      summary = "Uploaded files";
    }
  }
  return (
    <span
      className="text-xs truncate block max-w-[22ch]"
      style={{ color: "var(--color-text-primary)" }}
      title={summary}
    >
      {summary}
      {item.parent_audit_id && (
        <span
          className="ml-1 text-[10px] uppercase"
          style={{ color: "var(--color-primary)" }}
        >
          resubmit
        </span>
      )}
    </span>
  );
}

function StatusPill({ status }: { status: AdminAuditListItem["status"] }) {
  const map: Record<
    AdminAuditListItem["status"],
    { color: string; icon: React.ReactNode }
  > = {
    queued: { color: "var(--color-text-muted)", icon: <Clock size={11} /> },
    running: {
      color: "var(--color-primary)",
      icon: <Loader2 size={11} className="animate-spin" />,
    },
    completed: {
      color: "var(--color-success)",
      icon: <CheckCircle2 size={11} />,
    },
    failed: { color: "var(--color-danger)", icon: <XCircle size={11} /> },
  };
  const { color, icon } = map[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1"
      style={{
        color,
        backgroundColor: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {icon}
      {status}
    </span>
  );
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

function Pagination({
  offset,
  pageSize,
  total,
  from,
  to,
  onPrev,
  onNext,
}: {
  offset: number;
  pageSize: number;
  total: number;
  from: number;
  to: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const prevDisabled = offset === 0;
  const nextDisabled = offset + pageSize >= total;
  return (
    <div className="flex items-center justify-between text-xs">
      <span style={{ color: "var(--color-text-tertiary)" }}>
        {total === 0
          ? "No rows"
          : `Showing ${from}–${to} of ${total.toLocaleString()}`}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={prevDisabled}
          className="h-8 w-8 inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
          }}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="h-8 w-8 inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
          }}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
