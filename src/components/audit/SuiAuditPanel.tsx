import type { SuiAudit } from "@/types/audit";

interface SuiAuditPanelProps {
  suiAudit: SuiAudit;
}

const VERDICT_COLORS: Record<string, string> = {
  "fully-proven": "var(--color-success)",
  "partially-proven": "var(--color-warning)",
  "parse-only": "var(--color-text-muted)",
  unproven: "var(--color-danger)",
};

const PRODUCTION_VERDICT_COLORS: Record<string, string> = {
  "production-ready": "var(--color-success)",
  "assisted-beta": "var(--color-warning)",
  "prototype-only": "#f97316",
  "not-for-production": "var(--color-danger)",
};

function verdictColor(map: Record<string, string>, value?: string): string {
  if (!value) return "var(--color-text-secondary)";
  return map[value] ?? "var(--color-text-secondary)";
}

function toNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function CoverageBar({
  label,
  executed,
  total,
}: {
  label: string;
  executed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;
  const tint =
    pct >= 75
      ? "var(--color-success)"
      : pct >= 40
        ? "var(--color-warning)"
        : "var(--color-danger)";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
        <span
          className="font-mono"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {executed}
          <span style={{ color: "var(--color-text-muted)" }}> / {total}</span>
          <span
            className="ml-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            ({pct}%)
          </span>
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-bg-tertiary)" }}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: tint }}
        />
      </div>
    </div>
  );
}

export function SuiAuditPanel({ suiAudit }: SuiAuditPanelProps) {
  const hardGate = (suiAudit.hardGate ?? {}) as Record<string, unknown>;
  const methodsTotal = toNum(hardGate.methodsTotal);
  const executed = toNum(hardGate.executedMethods);
  const packageExecuted = toNum(hardGate.packageExecutedMethods);
  const devnetExecuted = toNum(hardGate.devnetExecutedMethods);
  const unsupported = toNum(hardGate.unsupportedMethods);
  const devnetRequired = toNum(hardGate.devnetRequiredMethods);

  return (
    <section
      className="p-5 space-y-5"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Sui audit
          </div>
          <div
            className="text-base font-semibold mt-0.5"
            style={{ color: "var(--color-text-primary)" }}
          >
            {suiAudit.executionModeAchieved ?? suiAudit.executionModeRequested ?? "—"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {suiAudit.evidenceVerdict && (
            <Badge
              label="Evidence"
              value={suiAudit.evidenceVerdict}
              color={verdictColor(VERDICT_COLORS, suiAudit.evidenceVerdict)}
            />
          )}
          {suiAudit.productionVerdict && (
            <Badge
              label="Production"
              value={suiAudit.productionVerdict}
              color={verdictColor(PRODUCTION_VERDICT_COLORS, suiAudit.productionVerdict)}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Fact
          label="Execution mode"
          value={`${suiAudit.executionModeAchieved ?? "—"}${
            suiAudit.executionModeRequested &&
            suiAudit.executionModeRequested !== suiAudit.executionModeAchieved
              ? ` (asked ${suiAudit.executionModeRequested})`
              : ""
          }`}
        />
        <Fact
          label="Devnet available"
          value={suiAudit.devnetAvailable ? "yes" : "no"}
        />
        <Fact
          label="Parser fallback"
          value={suiAudit.parserFallbackUsed ? "yes" : "no"}
        />
        <Fact
          label="Methods covered"
          value={
            methodsTotal !== null && executed !== null
              ? `${executed} / ${methodsTotal}`
              : "—"
          }
        />
      </div>

      {methodsTotal !== null && methodsTotal > 0 && (
        <div className="space-y-3">
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Method coverage
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {executed !== null && (
              <CoverageBar
                label="Total executed"
                executed={executed}
                total={methodsTotal}
              />
            )}
            {packageExecuted !== null && (
              <CoverageBar
                label="Via package tests"
                executed={packageExecuted}
                total={methodsTotal}
              />
            )}
            {devnetExecuted !== null && (
              <CoverageBar
                label="Via devnet"
                executed={devnetExecuted}
                total={methodsTotal}
              />
            )}
          </div>
          {(unsupported !== null || devnetRequired !== null) && (
            <div
              className="text-xs"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {unsupported !== null && (
                <>Unsupported: {unsupported}. </>
              )}
              {devnetRequired !== null && (
                <>Devnet-required: {devnetRequired}.</>
              )}
            </div>
          )}
        </div>
      )}

      {Array.isArray(suiAudit.notes) && suiAudit.notes.length > 0 && (
        <div className="space-y-1.5">
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Notes
          </h3>
          <ul className="space-y-1 text-xs list-disc pl-4">
            {suiAudit.notes.map((note, i) => (
              <li key={i} style={{ color: "var(--color-text-secondary)" }}>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="px-3 py-2"
      style={{
        backgroundColor: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </div>
      <div
        className="text-xs mt-0.5 font-mono truncate"
        style={{ color: "var(--color-text-primary)" }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function Badge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs"
      style={{
        backgroundColor: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span style={{ color: "var(--color-text-muted)" }}>{label}:</span>
      <span style={{ color: "var(--color-text-primary)" }}>{value}</span>
    </span>
  );
}
