'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  FlaskConical,
} from 'lucide-react';
import type { TestReport, TestResult } from '@/types/audit';

interface TestResultsProps {
  testReport: TestReport;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--color-danger)',
  high: 'var(--color-danger)',
  medium: 'var(--color-warning)',
  low: 'var(--color-info)',
  info: 'var(--color-text-muted)',
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className="text-[11px] font-bold uppercase px-1.5 py-0.5"
      style={{
        color: SEVERITY_COLORS[severity] ?? 'var(--color-text-muted)',
        backgroundColor: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {severity}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className="text-[11px] font-medium px-1.5 py-0.5"
      style={{
        color: 'var(--color-text-secondary)',
        backgroundColor: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {category}
    </span>
  );
}

function TestRow({ test }: { test: TestResult }) {
  const [expanded, setExpanded] = useState(!test.passed);

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-3 text-left transition-colors"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        {expanded ? (
          <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        ) : (
          <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        )}
        {test.passed ? (
          <CheckCircle2 size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
        ) : (
          <XCircle size={14} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
        )}
        <span
          className="text-xs font-medium truncate flex-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {test.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <CategoryBadge category={test.category} />
          <SeverityBadge severity={test.severity} />
          {test.gasUsed != null && (
            <span
              className="text-[11px] font-mono flex items-center gap-0.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Flame size={10} />
              {test.gasUsed.toLocaleString()}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div
          className="px-3 pb-3 pt-1 space-y-1.5"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {test.description}
          </p>
          {test.error && (
            <div
              className="p-2 text-xs font-mono"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-danger)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {test.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TestResults({ testReport }: TestResultsProps) {
  const { totalTests, passed, failed, duration, results } = testReport;
  const passRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <FlaskConical size={16} style={{ color: 'var(--color-info)' }} />
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Test Results
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="flex flex-col items-center gap-1 p-3"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
          <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-success)' }}>
            {passed}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Passed</span>
        </div>
        <div
          className="flex flex-col items-center gap-1 p-3"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <XCircle size={16} style={{ color: 'var(--color-danger)' }} />
          <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-danger)' }}>
            {failed}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Failed</span>
        </div>
        <div
          className="flex flex-col items-center gap-1 p-3"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
            {(duration / 1000).toFixed(1)}s
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Duration</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {passed} passed / {failed} failed / {totalTests} total
          </span>
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: passRate >= 80 ? 'var(--color-success)' : passRate >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}
          >
            {passRate.toFixed(0)}%
          </span>
        </div>
        <div
          className="w-full h-2 overflow-hidden flex"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {passed > 0 && (
            <div
              className="h-full"
              style={{
                width: `${passRate}%`,
                backgroundColor: 'var(--color-success)',
              }}
            />
          )}
          {failed > 0 && (
            <div
              className="h-full"
              style={{
                width: `${((failed / totalTests) * 100)}%`,
                backgroundColor: 'var(--color-danger)',
              }}
            />
          )}
        </div>
      </div>

      {/* Test list */}
      <div className="space-y-2">
        {results.map((test) => (
          <TestRow key={test.name} test={test} />
        ))}
      </div>
    </div>
  );
}
