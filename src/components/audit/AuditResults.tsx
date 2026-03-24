'use client';

import { useCallback } from 'react';
import {
  Layers,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  AlertOctagon,
} from 'lucide-react';
import { ModuleCard } from './ModuleCard';
import type { AuditResponse } from '@/types/audit';

interface AuditResultsProps {
  results: AuditResponse;
}

function generateMarkdownReport(results: AuditResponse): string {
  const lines: string[] = [];
  lines.push('# goBlink Audit Report');
  lines.push(`**Date:** ${new Date(results.timestamp).toISOString()}`);
  lines.push(`**Chain:** ${results.chain}`);
  lines.push(`**Duration:** ${(results.durationMs / 1000).toFixed(1)}s`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Modules: ${results.summary.totalModules}`);
  lines.push(`- Specs: ${results.summary.totalSpecs}`);
  lines.push(`- ✅ Verified: ${results.summary.verified}`);
  lines.push(`- ❌ Violated: ${results.summary.violated}`);
  lines.push(`- ⚠️ Unknown: ${results.summary.unknown}`);
  lines.push('');

  for (const mod of results.modules) {
    lines.push(`## Module: ${mod.name}`);
    lines.push(`Chain: ${mod.chain} | Functions: ${mod.functions.length} | State vars: ${mod.stateVars.length}`);
    lines.push('');
    for (const fn of mod.functions) {
      lines.push(`### ${fn.name}(${fn.params.join(', ')})`);
      lines.push(`Status: ${fn.status}`);
      if (fn.requires.length > 0) {
        lines.push('**Requires:**');
        fn.requires.forEach((r) => lines.push(`  - ${r.expression}`));
      }
      if (fn.ensures.length > 0) {
        lines.push('**Ensures:**');
        fn.ensures.forEach((e) => lines.push(`  - ${e.expression}`));
      }
      if (fn.counterexample) {
        lines.push(`**Counterexample:** ${fn.counterexample}`);
      }
      lines.push('');
    }
  }

  if (results.crossModuleWarnings.length > 0) {
    lines.push('## Cross-Module Warnings');
    for (const w of results.crossModuleWarnings) {
      lines.push(`- [${w.severity.toUpperCase()}] ${w.message} (${w.modules.join(', ')})`);
    }
  }

  return lines.join('\n');
}

export function AuditResults({ results }: AuditResultsProps) {
  const { summary, modules, crossModuleWarnings } = results;

  const handleDownload = useCallback(() => {
    const md = generateMarkdownReport(results);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${results.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const statCards: Array<{
    label: string;
    value: number;
    color: string;
    Icon: typeof Layers;
  }> = [
    { label: 'Modules', value: summary.totalModules, color: 'var(--color-primary)', Icon: Layers },
    { label: 'Specs', value: summary.totalSpecs, color: 'var(--color-info)', Icon: FileText },
    { label: 'Verified', value: summary.verified, color: 'var(--color-success)', Icon: CheckCircle2 },
    { label: 'Violated', value: summary.violated, color: 'var(--color-danger)', Icon: XCircle },
    { label: 'Unknown', value: summary.unknown, color: 'var(--color-warning)', Icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map(({ label, value, color, Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 p-3"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <Icon size={18} style={{ color }} />
            <span className="text-lg font-bold tabular-nums" style={{ color }}>
              {value}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Cross-module warnings */}
      {crossModuleWarnings.length > 0 && (
        <div
          className="p-4 space-y-2"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon size={16} style={{ color: 'var(--color-warning)' }} />
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--color-warning)' }}
            >
              Cross-Module Warnings
            </span>
          </div>
          {crossModuleWarnings.map((w, i) => (
            <div key={i} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <span
                className="font-semibold uppercase mr-1"
                style={{
                  color:
                    w.severity === 'high'
                      ? 'var(--color-danger)'
                      : w.severity === 'medium'
                        ? 'var(--color-warning)'
                        : 'var(--color-text-muted)',
                }}
              >
                [{w.severity}]
              </span>
              {w.message}
              <span style={{ color: 'var(--color-text-muted)' }}> — {w.modules.join(', ')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Module list */}
      <div className="space-y-3">
        {modules.map((mod, i) => (
          <ModuleCard key={mod.name} module={mod} defaultOpen={i === 0} />
        ))}
      </div>

      {/* Download */}
      <button
        onClick={handleDownload}
        className="btn btn-secondary w-full h-11 text-sm gap-2"
      >
        <Download size={16} />
        Download Report
      </button>
    </div>
  );
}
