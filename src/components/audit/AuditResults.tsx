'use client';

import { useState, useCallback } from 'react';
import {
  Layers,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  AlertOctagon,
  Code2,
  ListChecks,
  Share2,
  Copy,
  ExternalLink,
  Check,
  FileDown,
} from 'lucide-react';
import { ModuleCard } from './ModuleCard';
import { TestResults } from './TestResults';
import { ScamWarnings } from './ScamWarnings';
import { PatternMatches } from './PatternMatches';
import { SecurityScore } from './SecurityScore';
import { RemediationCard } from './RemediationCard';
import { CodeViewer } from './CodeViewer';
import { ContractComparison } from './ContractComparison';
import { GasInsights } from './GasInsights';
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
    lines.push('');
  }

  if (results.testReport) {
    const tr = results.testReport;
    lines.push('## Test Results');
    lines.push(`- Contract: ${tr.contractName}`);
    lines.push(`- Total: ${tr.totalTests} | Passed: ${tr.passed} | Failed: ${tr.failed}`);
    lines.push(`- Duration: ${(tr.duration / 1000).toFixed(1)}s`);
    lines.push('');

    if (tr.matchedPatterns > 0) {
      lines.push(`### Pattern Matches: ${tr.matchedPatterns}`);
      lines.push(`- Exploit: ${tr.patternCoverage.exploit}`);
      lines.push(`- Scam: ${tr.patternCoverage.scam}`);
      lines.push(`- Non-EVM: ${tr.patternCoverage.nonEvm}`);
      lines.push('');
    }

    if (tr.scamFlags.length > 0) {
      lines.push('### ⚠️ Scam Warnings');
      for (const flag of tr.scamFlags) {
        lines.push(`- **[${flag.severity.toUpperCase()}]** ${flag.name} (${flag.confidence}% confidence)`);
        lines.push(`  ${flag.description}`);
        if (flag.lineNumber != null) lines.push(`  Line: ${flag.lineNumber}`);
        lines.push(`  Code: \`${flag.matchedCode}\``);
        if (flag.redFlags.length > 0) lines.push(`  Red flags: ${flag.redFlags.join(', ')}`);
      }
      lines.push('');
    }

    lines.push('### Individual Tests');
    for (const test of tr.results) {
      const status = test.passed ? '✅' : '❌';
      lines.push(`- ${status} **${test.name}** [${test.category}] [${test.severity}]`);
      if (test.error) lines.push(`  Error: ${test.error}`);
      if (test.gasUsed != null) lines.push(`  Gas: ${test.gasUsed.toLocaleString()}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

type ViewTab = 'findings' | 'code';

export function AuditResults({ results }: AuditResultsProps) {
  const { summary, modules, crossModuleWarnings } = results;
  const [activeTab, setActiveTab] = useState<ViewTab>('findings');

  const hasCodeView = !!results.sourceCode;

  // Detect language from chain for code viewer
  const codeLanguage: 'solidity' | 'move' | 'rust' =
    results.chain === 'sui' || results.chain === 'aptos' ? 'move' :
    results.chain === 'solana' || results.chain === 'near' ? 'rust' :
    'solidity';

  const handleDownloadMarkdown = useCallback(() => {
    const md = generateMarkdownReport(results);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${results.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const handleDownloadPDF = useCallback(async () => {
    const ZION_API = process.env.NEXT_PUBLIC_ZION_API_URL || 'http://localhost:3900';
    try {
      const res = await fetch(`${ZION_API}/api/audit/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results),
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      // Fallback: generate a simple printable page client-side
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const md = generateMarkdownReport(results);
        printWindow.document.write(`<html><head><title>Audit Report</title><style>body{font-family:system-ui;background:#0a0b0f;color:#f1f1f3;padding:40px;max-width:800px;margin:0 auto}pre{white-space:pre-wrap}</style></head><body><pre>${md.replace(/</g, '&lt;')}</pre></body></html>`);
        printWindow.document.close();
      }
    }
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

  const testReport = results.testReport;
  const hasScamFlags = testReport && testReport.scamFlags.length > 0;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Security Score — FIRST thing shown */}
      {results.securityScore && (
        <SecurityScore score={results.securityScore} />
      )}

      {/* Scam warning banner — TOP of results if flags found */}
      {hasScamFlags && <ScamWarnings scamFlags={testReport.scamFlags} />}

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

      {/* View tab switcher — only show if source code available */}
      {hasCodeView && (
        <div
          className="flex gap-1"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
          }}
        >
          <button
            onClick={() => setActiveTab('findings')}
            className="flex items-center gap-1.5"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'findings' ? 'var(--color-bg-secondary)' : 'transparent',
              color: activeTab === 'findings' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              transition: 'all 0.15s',
            }}
          >
            <ListChecks size={14} />
            Findings
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className="flex items-center gap-1.5"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'code' ? 'var(--color-bg-secondary)' : 'transparent',
              color: activeTab === 'code' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              transition: 'all 0.15s',
            }}
          >
            <Code2 size={14} />
            Code View
          </button>
        </div>
      )}

      {/* Code View Tab */}
      {activeTab === 'code' && hasCodeView && results.sourceCode && (
        <CodeViewer
          sourceCode={results.sourceCode}
          language={codeLanguage}
          annotations={results.annotations ?? []}
        />
      )}

      {/* Findings Tab */}
      {activeTab === 'findings' && (
        <>
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

          {/* Scam flags with remediation */}
          {hasScamFlags && testReport.scamFlags.map((flag, i) => (
            flag.remediation ? (
              <RemediationCard key={`rem-${i}`} remediation={flag.remediation} />
            ) : null
          ))}

          {/* Test Results Section */}
          {testReport && testReport.totalTests > 0 && (
            <TestResults testReport={testReport} />
          )}

          {/* Pattern Match Section */}
          {testReport && testReport.matchedPatterns > 0 && (
            <PatternMatches
              matchedPatterns={testReport.matchedPatterns}
              patternCoverage={testReport.patternCoverage}
            />
          )}

          {/* Scam Scanner — clean badge if no flags */}
          {testReport && !hasScamFlags && (
            <ScamWarnings scamFlags={[]} />
          )}
        </>
      )}

      {/* Contract Comparison */}
      {results.similarity && results.similarity.similarity > 0 && (
        <ContractComparison similarity={results.similarity} />
      )}

      {/* Gas Insights */}
      {results.gasInsights && results.gasInsights.length > 0 && (
        <GasInsights insights={results.gasInsights} />
      )}

      {/* Share Your Audit */}
      <ShareAuditSection auditId={results.id} />

      {/* Download buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDownloadMarkdown}
          className="btn btn-secondary h-11 text-sm gap-2"
        >
          <Download size={16} />
          Download Markdown
        </button>
        <button
          onClick={handleDownloadPDF}
          className="btn btn-primary h-11 text-sm gap-2"
        >
          <FileDown size={16} />
          Download PDF
        </button>
      </div>
    </div>
  );
}

/* ─── Share Audit Section ─── */

function ShareAuditSection({ auditId }: { auditId: string }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const ZION_API = process.env.NEXT_PUBLIC_ZION_API_URL || 'http://localhost:3900';
  const badgeUrl = `${ZION_API}/api/audit/badge/${auditId}`;
  const certUrl = `${ZION_API}/api/audit/certificate/${auditId}`;
  const verifyUrl = `https://hub.goblink.io/audit/verify/${auditId}`;

  const badgeMarkdown = `[![goBlink Audit](${badgeUrl})](${verifyUrl})`;
  const badgeHtml = `<a href="${verifyUrl}"><img src="${badgeUrl}" alt="goBlink Audit" /></a>`;

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Silent fallback
    }
  }, []);

  return (
    <div
      className="p-4 sm:p-5 space-y-4"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div className="flex items-center gap-2">
        <Share2 size={16} style={{ color: 'var(--color-primary)' }} />
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Share Your Audit
        </span>
      </div>

      {/* Badge Preview */}
      <div
        className="flex items-center justify-center p-4"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeUrl}
          alt="goBlink Audit Badge"
          style={{ height: 22 }}
        />
      </div>

      {/* Copy buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <CopyButton
          label="Copy Markdown"
          text={badgeMarkdown}
          field="md"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />
        <CopyButton
          label="Copy HTML"
          text={badgeHtml}
          field="html"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />
        <a
          href={certUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary h-9 text-xs gap-1.5"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={12} />
          View Certificate
        </a>
      </div>
    </div>
  );
}

function CopyButton({
  label,
  text,
  field,
  copiedField,
  onCopy,
}: {
  label: string;
  text: string;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}) {
  const isCopied = copiedField === field;
  return (
    <button
      onClick={() => onCopy(text, field)}
      className="btn btn-secondary h-9 text-xs gap-1.5"
    >
      {isCopied ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
      {isCopied ? 'Copied!' : label}
    </button>
  );
}
