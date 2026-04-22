import type { ZionStats } from "@/types/audit";

interface StatsStripProps {
  stats: ZionStats | null;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

export function StatsStrip({ stats }: StatsStripProps) {
  const items: Array<{ label: string; value: string }> = stats
    ? [
        { label: "Patterns", value: formatNumber(stats.patterns) },
        { label: "Exploits indexed", value: formatNumber(stats.exploits) },
        { label: "Losses referenced", value: formatUsd(stats.totalLosses) },
        { label: "Chains supported", value: formatNumber(stats.chainsSupported) },
        { label: "Audits performed", value: formatNumber(stats.auditsPerformed) },
      ]
    : Array(5).fill({ label: "—", value: "—" });

  return (
    <section className="px-4">
      <div
        className="mx-auto max-w-5xl grid grid-cols-2 sm:grid-cols-5 gap-3"
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="card-standard px-4 py-3 text-center"
          >
            <div
              className="text-lg font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {item.value}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
