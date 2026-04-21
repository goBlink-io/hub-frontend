"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Download, RotateCw } from "lucide-react";
import type { AuditFinding, AuditResponse, ReportFormat } from "@/types/audit";
import { ScoreCard } from "./ScoreCard";
import { FindingsList } from "./FindingsList";
import { ModuleTable } from "./ModuleTable";
import { SuiAuditPanel } from "./SuiAuditPanel";
import { ResubmitDialog } from "./ResubmitDialog";

interface AuditReportProps {
  result: AuditResponse;
  jobId: string;
  maxBytes: number;
}

type Tab = "overview" | "findings" | "modules" | "score" | "raw";

export function AuditReport({ result, jobId, maxBytes }: AuditReportProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [resubmitOpen, setResubmitOpen] = useState(false);

  const tabs = useMemo<Array<{ id: Tab; label: string }>>(() => {
    const base: Array<{ id: Tab; label: string }> = [
      { id: "overview", label: "Overview" },
      { id: "findings", label: "Findings" },
      { id: "modules", label: "Modules" },
      { id: "score", label: "Score" },
    ];
    base.push({ id: "raw", label: "Raw JSON" });
    return base;
  }, []);

  const findings = result.findings ?? [];
  const informational = result.informationalFindings ?? [];

  return (
    <section className="space-y-4">
      <Header
        result={result}
        jobId={jobId}
        onResubmit={() => setResubmitOpen(true)}
      />

      <ResubmitDialog
        open={resubmitOpen}
        onClose={() => setResubmitOpen(false)}
        auditId={result.auditId}
        maxBytes={maxBytes}
      />

      <nav
        className="flex gap-1 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 h-10 text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              color:
                tab === t.id
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
              borderBottom: `2px solid ${
                tab === t.id ? "var(--color-primary)" : "transparent"
              }`,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <OverviewTab
          result={result}
          findings={findings}
          informational={informational}
        />
      )}
      {tab === "findings" && (
        <FindingsList
          findings={findings}
          informational={informational}
        />
      )}
      {tab === "modules" && <ModuleTable modules={result.modules ?? []} />}
      {tab === "score" && <ScoreTab result={result} />}
      {tab === "raw" && <RawTab result={result} />}
    </section>
  );
}

function Header({
  result,
  jobId,
  onResubmit,
}: {
  result: AuditResponse;
  jobId: string;
  onResubmit: () => void;
}) {
  const score = result.securityScore;
  const remaining = result.resubmissionsRemaining;
  const exhausted = typeof remaining === "number" && remaining <= 0;
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-4 p-5"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div>
        <div
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Audit result
        </div>
        <div
          className="text-lg font-semibold mt-1"
          style={{ color: "var(--color-text-primary)" }}
        >
          {result.chain} · {result.language}
        </div>
        <div
          className="text-xs font-mono mt-1"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {result.auditId}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {score && (
          <>
            <div className="text-right">
              <div
                className="text-xs uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Score
              </div>
              <div
                className="text-2xl font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {score.overall}
                <span
                  className="text-sm ml-1"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  /100
                </span>
              </div>
            </div>
            <div
              className="flex items-center justify-center text-2xl font-bold"
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-bg-tertiary)",
                color: gradeColor(score.grade),
              }}
              aria-label={`Grade ${score.grade}`}
            >
              {score.grade}
            </div>
          </>
        )}
        <button
          type="button"
          onClick={onResubmit}
          disabled={exhausted}
          title={
            exhausted
              ? "Free resubmissions exhausted. Paid plans coming soon."
              : typeof remaining === "number"
                ? `${remaining} free resubmission${remaining === 1 ? "" : "s"} remaining`
                : "Resubmit with updated contract files"
          }
          className="inline-flex items-center gap-2 h-10 px-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "var(--color-bg-tertiary)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <RotateCw size={14} />
          Resubmit
        </button>
        <DownloadMenu jobId={jobId} />
      </div>
    </header>
  );
}

function DownloadMenu({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const formats: Array<{ format: ReportFormat; label: string }> = [
    { format: "md", label: "Markdown" },
    { format: "html", label: "HTML" },
    { format: "pdf", label: "PDF" },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-10 px-3 text-sm font-medium"
        style={{
          backgroundColor: "var(--color-bg-tertiary)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Download size={14} />
        Download
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: "var(--z-dropdown)" }}
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 mt-1 min-w-[10rem] p-1"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              zIndex: "var(--z-dropdown)",
            }}
          >
            {formats.map((f) => (
              <a
                key={f.format}
                href={`/api/zion/jobs/${encodeURIComponent(jobId)}/report?format=${f.format}`}
                download
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 h-9 text-sm transition-colors"
                style={{
                  color: "var(--color-text-primary)",
                  borderRadius: "var(--radius-sm)",
                }}
                role="menuitem"
              >
                {f.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function gradeColor(grade: string): string {
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

function OverviewTab({
  result,
  findings,
  informational,
}: {
  result: AuditResponse;
  findings: AuditResponse["findings"];
  informational: AuditFinding[];
}) {
  const summary = result.summary;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <Stat label="Modules" value={summary.modules} />
        <Stat label="Functions" value={summary.functions} />
        <Stat label="Specs inferred" value={summary.specsInferred} />
        <Stat label="Verified" value={summary.verified} tint="var(--color-success)" />
        <Stat label="Violated" value={summary.violated} tint="var(--color-danger)" />
        <Stat label="Unknown" value={summary.unknown} tint="var(--color-warning)" />
      </div>

      {result.suiAudit && <SuiAuditPanel suiAudit={result.suiAudit} />}

      <FindingsList
        findings={findings}
        informational={informational}
        compact
        initialLimit={3}
      />
    </div>
  );
}

function ScoreTab({ result }: { result: AuditResponse }) {
  return (
    <div className="space-y-4">
      <ScoreCard score={result.securityScore} />
      {result.suiAudit && <SuiAuditPanel suiAudit={result.suiAudit} />}
    </div>
  );
}

function RawTab({ result }: { result: AuditResponse }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(result, null, 2);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 text-xs px-2 h-8"
          style={{
            backgroundColor: "var(--color-bg-tertiary)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="text-xs overflow-auto p-3 font-mono"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-secondary)",
          maxHeight: "60vh",
        }}
      >
        {json}
      </pre>
    </div>
  );
}

function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint?: string;
}) {
  return (
    <div
      className="p-3 text-center"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div
        className="text-lg font-semibold"
        style={{ color: tint ?? "var(--color-text-primary)" }}
      >
        {value}
      </div>
      <div
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </div>
    </div>
  );
}

