import type { ZionPattern, Severity } from "@/types/audit";

interface PatternsGridProps {
  patterns: ZionPattern[] | null;
  limit?: number;
}

const severityColor: Record<Severity, string> = {
  critical: "var(--color-danger)",
  high: "#f97316",
  medium: "var(--color-warning)",
  low: "var(--color-info)",
  info: "var(--color-text-muted)",
};

export function PatternsGrid({ patterns, limit = 12 }: PatternsGridProps) {
  const items = patterns?.slice(0, limit) ?? [];

  return (
    <section className="px-4 space-y-3">
      <div className="mx-auto max-w-5xl">
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          DeFi patterns verified
        </h2>
        <p
          className="text-xs mt-1"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Every audit is matched against this library of proven invariants.
        </p>
      </div>
      <div className="mx-auto max-w-5xl grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0
          ? Array(6)
              .fill(null)
              .map((_, i) => (
                <div
                  key={i}
                  className="card-standard p-3 animate-pulse"
                  style={{ minHeight: "72px" }}
                />
              ))
          : items.map((p) => (
              <div key={p.id} className="card-standard p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {p.name}
                    </div>
                    <div
                      className="text-xs mt-0.5 truncate"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {p.category}
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
                    style={{
                      color: severityColor[p.severity] ?? severityColor.info,
                      backgroundColor: "var(--color-bg-tertiary)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {p.severity}
                  </span>
                </div>
                <p
                  className="text-xs mt-2 line-clamp-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {p.description}
                </p>
              </div>
            ))}
      </div>
    </section>
  );
}
