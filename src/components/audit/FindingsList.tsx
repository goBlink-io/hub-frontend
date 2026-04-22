"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AuditFinding, Severity } from "@/types/audit";

interface FindingsListProps {
  findings: AuditFinding[];
  informational?: AuditFinding[];
  compact?: boolean;
  /** Max items rendered; remaining collapsed behind "Show more". */
  initialLimit?: number;
}

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

const severityTint: Record<Severity, string> = {
  critical: "var(--color-danger)",
  high: "#f97316",
  medium: "var(--color-warning)",
  low: "var(--color-info)",
  info: "var(--color-text-muted)",
};

const severityRank: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function FindingsList({
  findings,
  informational,
  compact,
  initialLimit,
}: FindingsListProps) {
  const allFindings = useMemo(
    () => [...findings, ...(informational ?? [])],
    [findings, informational],
  );

  const grouped = useMemo(() => {
    const map = new Map<Severity, AuditFinding[]>();
    for (const sev of SEVERITY_ORDER) map.set(sev, []);
    for (const f of allFindings) {
      const bucket = map.get(f.severity) ?? map.get("info")!;
      bucket.push(f);
    }
    return map;
  }, [allFindings]);

  if (allFindings.length === 0) {
    return (
      <div
        className="text-sm p-5 text-center"
        style={{
          color: "var(--color-text-tertiary)",
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px dashed var(--color-border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        No findings reported.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SeveritySummary counts={Object.fromEntries(
        SEVERITY_ORDER.map((s) => [s, grouped.get(s)?.length ?? 0]),
      ) as Record<Severity, number>} />

      {SEVERITY_ORDER.map((sev) => {
        const bucket = grouped.get(sev) ?? [];
        if (bucket.length === 0) return null;
        return (
          <SeverityGroup
            key={sev}
            severity={sev}
            findings={bucket}
            compact={compact}
            initialLimit={initialLimit}
          />
        );
      })}
    </div>
  );
}

function SeveritySummary({ counts }: { counts: Record<Severity, number> }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {SEVERITY_ORDER.map((sev) => (
        <li
          key={sev}
          className="flex items-center gap-2 px-2.5 h-8 text-xs"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: severityTint[sev] }}
          />
          <span
            className="uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {sev}
          </span>
          <span
            className="font-mono"
            style={{ color: "var(--color-text-primary)" }}
          >
            {counts[sev] ?? 0}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SeverityGroup({
  severity,
  findings,
  compact,
  initialLimit = 8,
}: {
  severity: Severity;
  findings: AuditFinding[];
  compact?: boolean;
  initialLimit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(
    () =>
      [...findings].sort(
        (a, b) =>
          severityRank[a.severity] - severityRank[b.severity] ||
          (a.title ?? "").localeCompare(b.title ?? ""),
      ),
    [findings],
  );
  const visible = expanded ? sorted : sorted.slice(0, initialLimit);
  const hidden = sorted.length - visible.length;
  return (
    <section className="space-y-2">
      <h3
        className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
        style={{ color: severityTint[severity] }}
      >
        {severity}
        <span style={{ color: "var(--color-text-tertiary)" }}>
          · {sorted.length}
        </span>
      </h3>
      <ul className="space-y-2">
        {visible.map((f, i) => (
          <FindingRow key={f.id ?? `${severity}-${i}`} finding={f} compact={compact} />
        ))}
      </ul>
      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs inline-flex items-center gap-1"
          style={{ color: "var(--color-primary)" }}
        >
          <ChevronDown size={12} />
          Show {hidden} more
        </button>
      )}
    </section>
  );
}

function FindingRow({
  finding,
  compact,
}: {
  finding: AuditFinding;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canExpand = Boolean(finding.remediation || finding.module || finding.category);

  return (
    <li
      className="p-3 space-y-1.5 transition-colors"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
          style={{
            color: severityTint[finding.severity] ?? severityTint.info,
            backgroundColor: "var(--color-bg-tertiary)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {finding.severity}
        </span>
        {finding.id && (
          <span
            className="text-[10px] font-mono"
            style={{ color: "var(--color-text-muted)" }}
          >
            {finding.id}
          </span>
        )}
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {finding.title}
        </span>
        {finding.cwe && (
          <span
            className="text-xs font-mono"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {finding.cwe}
          </span>
        )}
      </div>
      <p
        className={`text-sm ${compact ? "line-clamp-2" : ""}`}
        style={{ color: "var(--color-text-secondary)" }}
      >
        {finding.description}
      </p>
      {(finding.module || finding.category) && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          {finding.module && (
            <Meta label="Module" value={finding.module} />
          )}
          {finding.category && (
            <Meta label="Category" value={finding.category} />
          )}
          {finding.impact && (
            <Meta label="Impact" value={finding.impact} />
          )}
          {finding.likelihood && (
            <Meta label="Likelihood" value={finding.likelihood} />
          )}
        </div>
      )}
      {canExpand && finding.remediation && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs inline-flex items-center gap-1"
            style={{ color: "var(--color-primary)" }}
            aria-expanded={open}
          >
            <ChevronDown
              size={12}
              style={{
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform 150ms",
              }}
            />
            {open ? "Hide remediation" : "Show remediation"}
          </button>
          {open && (
            <p
              className="text-xs pl-2 border-l-2"
              style={{
                color: "var(--color-text-secondary)",
                borderColor: "var(--color-border)",
              }}
            >
              {finding.remediation}
            </p>
          )}
        </>
      )}
    </li>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ color: "var(--color-text-tertiary)" }}>
      <span style={{ color: "var(--color-text-muted)" }}>{label}:</span>{" "}
      <span className="font-mono" style={{ color: "var(--color-text-secondary)" }}>
        {value}
      </span>
    </span>
  );
}
