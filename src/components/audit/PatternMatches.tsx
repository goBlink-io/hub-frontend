'use client';

import { Database, Shield, Bug, Globe } from 'lucide-react';

interface PatternMatchesProps {
  matchedPatterns: number;
  patternCoverage: {
    exploit: number;
    scam: number;
    nonEvm: number;
  };
}

const TOTAL_PATTERNS = 365;

function CoverageBar({
  label,
  count,
  color,
  icon: Icon,
}: {
  label: string;
  count: number;
  color: string;
  icon: typeof Shield;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={12} style={{ color }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
          </span>
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {count}
        </span>
      </div>
      <div
        className="w-full h-1.5 overflow-hidden"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${Math.min((count / Math.max(TOTAL_PATTERNS, 1)) * 100, 100)}%`,
            backgroundColor: color,
            borderRadius: 'var(--radius-sm)',
          }}
        />
      </div>
    </div>
  );
}

export function PatternMatches({ matchedPatterns, patternCoverage }: PatternMatchesProps) {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Database size={16} style={{ color: 'var(--color-primary)' }} />
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Pattern Matching
        </span>
      </div>

      {/* Database coverage */}
      <div
        className="p-4 space-y-3"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Matched <strong style={{ color: 'var(--color-text-primary)' }}>{matchedPatterns}</strong>{' '}
            vulnerability patterns from database of{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{TOTAL_PATTERNS}</strong>
          </span>
        </div>

        {/* Overall progress bar */}
        <div
          className="w-full h-2 overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${Math.min((matchedPatterns / TOTAL_PATTERNS) * 100, 100)}%`,
              backgroundColor: matchedPatterns > 0 ? 'var(--color-warning)' : 'var(--color-success)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
        </div>

        {/* Breakdown */}
        <div className="space-y-2.5 pt-1">
          <CoverageBar
            label="Exploit Patterns"
            count={patternCoverage.exploit}
            color="var(--color-danger)"
            icon={Bug}
          />
          <CoverageBar
            label="Scam Patterns"
            count={patternCoverage.scam}
            color="var(--color-warning)"
            icon={Shield}
          />
          <CoverageBar
            label="Non-EVM Patterns"
            count={patternCoverage.nonEvm}
            color="var(--color-info)"
            icon={Globe}
          />
        </div>
      </div>
    </div>
  );
}
