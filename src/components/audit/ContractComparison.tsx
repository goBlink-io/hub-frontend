'use client';

import { CheckCircle2, AlertTriangle, MinusCircle, GitCompare } from 'lucide-react';
import type { SimilarityResult } from '@/types/audit';

interface ContractComparisonProps {
  similarity: SimilarityResult;
}

export function ContractComparison({ similarity }: ContractComparisonProps) {
  const { closestMatch, similarity: pct, matchedFunctions, extraFunctions, missingFunctions } = similarity;

  const barColor = pct >= 80
    ? 'var(--color-success)'
    : pct >= 50
      ? 'var(--color-warning)'
      : 'var(--color-danger)';

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
      <div className="flex items-center gap-2">
        <GitCompare size={18} style={{ color: 'var(--color-info)' }} />
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Contract Similarity
        </span>
      </div>

      {/* Match summary */}
      <div className="flex items-center gap-3">
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Matches{' '}
          <strong style={{ color: 'var(--color-text-primary)' }}>{closestMatch}</strong>
        </span>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: barColor }}
        >
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '8px',
          backgroundColor: 'var(--color-bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 'var(--radius-sm)',
            transition: 'width 0.6s ease',
          }}
        />
      </div>

      {/* Function lists */}
      <div className="space-y-3">
        {/* Matched */}
        {matchedFunctions.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--color-success)' }}
              >
                Standard Functions ({matchedFunctions.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchedFunctions.map((fn) => (
                <span
                  key={fn}
                  className="text-xs px-2 py-0.5"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    color: 'var(--color-success)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {fn}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Extra (red flags) */}
        {extraFunctions.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={13} style={{ color: 'var(--color-warning)' }} />
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--color-warning)' }}
              >
                Custom Functions ({extraFunctions.length}) — review carefully
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {extraFunctions.map((fn) => (
                <span
                  key={fn}
                  className="text-xs px-2 py-0.5"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    color: 'var(--color-warning)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  ⚠️ {fn}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing */}
        {missingFunctions.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <MinusCircle size={13} style={{ color: 'var(--color-text-muted)' }} />
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Missing Standard Functions ({missingFunctions.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missingFunctions.map((fn) => (
                <span
                  key={fn}
                  className="text-xs px-2 py-0.5"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-muted)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {fn}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
