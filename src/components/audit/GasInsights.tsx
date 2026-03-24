'use client';

import { Fuel, TrendingDown } from 'lucide-react';
import type { GasInsight } from '@/types/audit';

interface GasInsightsProps {
  insights: GasInsight[];
}

function gasColor(gasUsed: number): string {
  if (gasUsed > 100_000) return 'var(--color-danger)';
  if (gasUsed > 50_000) return 'var(--color-warning)';
  return 'var(--color-success)';
}

function severityBadge(severity: GasInsight['severity']): { bg: string; color: string } {
  switch (severity) {
    case 'high': return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' };
    case 'medium': return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' };
    case 'low': return { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' };
  }
}

function categoryLabel(category: GasInsight['category']): string {
  switch (category) {
    case 'storage': return '💾 Storage';
    case 'computation': return '⚙️ Computation';
    case 'external-call': return '📡 External Call';
    case 'loop': return '🔄 Loop';
    case 'memory': return '🧠 Memory';
  }
}

export function GasInsights({ insights }: GasInsightsProps) {
  if (insights.length === 0) return null;

  // Total potential savings (just count unique estimatedSaving strings)
  const highCount = insights.filter((i) => i.severity === 'high').length;
  const medCount = insights.filter((i) => i.severity === 'medium').length;
  const lowCount = insights.filter((i) => i.severity === 'low').length;

  return (
    <div
      className="space-y-4 animate-fade-up"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel size={18} style={{ color: 'var(--color-warning)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Gas Optimization Insights
          </span>
          <span
            className="text-xs px-1.5 py-0.5"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-muted)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {insights.length} suggestion{insights.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Severity summary */}
        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-danger)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {highCount} high
            </span>
          )}
          {medCount > 0 && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: 'var(--color-warning)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {medCount} med
            </span>
          )}
          {lowCount > 0 && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {lowCount} low
            </span>
          )}
        </div>
      </div>

      {/* Insights list */}
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const badge = severityBadge(insight.severity);
          return (
            <div
              key={i}
              className="flex flex-col gap-2 p-3"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold uppercase px-1.5 py-0.5"
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.color,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {insight.severity}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {insight.function}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {categoryLabel(insight.category)}
                  </span>
                </div>

                {insight.gasUsed > 0 && (
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: gasColor(insight.gasUsed) }}
                  >
                    {insight.gasUsed.toLocaleString()} gas
                  </span>
                )}
              </div>

              <p
                className="text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {insight.suggestion}
              </p>

              <div className="flex items-center gap-1.5">
                <TrendingDown size={11} style={{ color: 'var(--color-success)' }} />
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-success)' }}
                >
                  Estimated saving: {insight.estimatedSaving}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
