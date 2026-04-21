import type { SecurityScore } from "@/types/audit";

interface ScoreCardProps {
  score: SecurityScore;
}

const BREAKDOWN_LABELS: Record<string, string> = {
  verification: "Formal verification",
  testCoverage: "Test coverage",
  patternSafety: "Pattern safety",
  scamRisk: "Scam risk",
};

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

function riskColor(risk?: string): string {
  switch (risk) {
    case "Low":
      return "var(--color-success)";
    case "Medium":
      return "var(--color-warning)";
    case "High":
      return "#f97316";
    case "Critical":
      return "var(--color-danger)";
    default:
      return "var(--color-text-secondary)";
  }
}

function Bar({ label, value, max = 25 }: { label: string; value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tint =
    pct >= 75
      ? "var(--color-success)"
      : pct >= 50
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
          {value}
          <span style={{ color: "var(--color-text-muted)" }}> / {max}</span>
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

export function ScoreCard({ score }: ScoreCardProps) {
  const breakdownEntries = Object.entries(score.breakdown ?? {}).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );

  return (
    <section
      className="p-5 space-y-5"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Security score
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <div
              className="text-4xl font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {score.overall}
            </div>
            <div
              className="text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              / 100
            </div>
          </div>
          {score.riskLevel && (
            <div
              className="text-xs mt-1 font-medium"
              style={{ color: riskColor(score.riskLevel) }}
            >
              {score.riskLevel} risk
            </div>
          )}
        </div>
        <div
          className="flex items-center justify-center text-3xl font-bold"
          style={{
            width: 72,
            height: 72,
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-bg-tertiary)",
            color: gradeColor(score.grade),
          }}
          aria-label={`Grade ${score.grade}`}
        >
          {score.grade}
        </div>
      </div>

      {breakdownEntries.length > 0 && (
        <div className="space-y-3">
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Breakdown
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {breakdownEntries.map(([key, value]) => (
              <Bar
                key={key}
                label={BREAKDOWN_LABELS[key] ?? key}
                value={value}
                max={25}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
