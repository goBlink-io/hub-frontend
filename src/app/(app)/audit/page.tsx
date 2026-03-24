'use client';

import { useState, useCallback } from 'react';
import {
  Shield,
  Zap,
  Eye,
  Sparkles,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { FileUpload } from '@/components/audit/FileUpload';
import { AuditPayment } from '@/components/audit/AuditPayment';
import { AuditResults } from '@/components/audit/AuditResults';
import { runAudit } from '@/lib/audit-api';
import type { AuditChain, AuditOptions, AuditResponse } from '@/types/audit';

const AUDIT_PRICE = process.env.NEXT_PUBLIC_AUDIT_PRICE_USD || '9.99';

const CHAINS: Array<{ id: AuditChain; label: string }> = [
  { id: 'auto', label: 'Auto-Detect' },
  { id: 'sui', label: 'Sui' },
  { id: 'aptos', label: 'Aptos' },
  { id: 'evm', label: 'EVM' },
  { id: 'solana', label: 'Solana' },
  { id: 'near', label: 'NEAR' },
];

const HERO_STATS = [
  '105 Patterns',
  '150+ Exploits Tracked',
  '5 Chains',
  '$56B+ Losses Analyzed',
];

export default function AuditPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<AuditOptions>({
    chain: 'auto',
    irAnalysis: true,
    patternMatching: true,
    aiSpecs: false,
  });
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAudit = useCallback(async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 500);

    try {
      const res = await runAudit(files, options);
      setProgress(100);
      setResults(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [files, options]);

  const toggleOption = useCallback(
    (key: 'irAnalysis' | 'patternMatching' | 'aiSpecs') => {
      setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Shield size={28} style={{ color: 'var(--color-primary)' }} />
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            goBlink{' '}
            <span className="text-blue-gradient">Audit</span>
          </h1>
        </div>
        <p
          className="text-sm sm:text-base max-w-xl mx-auto"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Formal verification for smart contracts. Mathematical proof — no
          annotations required.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {HERO_STATS.map((stat) => (
            <span
              key={stat}
              className="text-xs font-medium px-2 py-1"
              style={{
                color: 'var(--color-text-muted)',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {stat}
            </span>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-h4 mb-4">Upload Contracts</h2>
        <FileUpload onFilesChange={setFiles} />
      </div>

      {/* Options Bar */}
      {files.length > 0 && (
        <div
          className="card p-4 sm:p-5 animate-fade-up"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Chain selector */}
            <div className="flex-1">
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Chain
              </label>
              <div className="relative">
                <select
                  value={options.chain}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      chain: e.target.value as AuditChain,
                    }))
                  }
                  className="input w-full h-10 text-sm font-semibold pr-8 appearance-none"
                >
                  {CHAINS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--color-text-muted)' }}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-4 flex-wrap">
              <ToggleOption
                label="IR Analysis"
                icon={<Eye size={14} />}
                active={options.irAnalysis}
                onToggle={() => toggleOption('irAnalysis')}
              />
              <ToggleOption
                label="Pattern Matching"
                icon={<Zap size={14} />}
                active={options.patternMatching}
                onToggle={() => toggleOption('patternMatching')}
              />
              <ToggleOption
                label="AI Specs"
                icon={<Sparkles size={14} />}
                active={options.aiSpecs}
                onToggle={() => toggleOption('aiSpecs')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment & Run */}
      {files.length > 0 && !results && (
        <div className="card p-5 sm:p-6 animate-fade-up">
          {!paid ? (
            <AuditPayment onPaymentComplete={() => setPaid(true)} priceUsd={AUDIT_PRICE} />
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <Loader2
                    size={32}
                    className="animate-spin"
                    style={{ color: 'var(--color-primary)' }}
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Running formal verification...
                  </p>
                  {/* Progress bar */}
                  <div
                    className="w-full h-2 overflow-hidden"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: 'var(--color-primary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    />
                  </div>
                  <span
                    className="text-xs tabular-nums"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {Math.round(progress)}%
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleRunAudit}
                  disabled={files.length === 0}
                  className="btn btn-primary w-full h-12 text-sm gap-2"
                >
                  <Shield size={16} />
                  Run Audit
                </button>
              )}

              {error && (
                <div
                  className="p-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-danger)',
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results && <AuditResults results={results} />}
    </div>
  );
}

/* ─── Toggle Option ─── */

function ToggleOption({
  label,
  icon,
  active,
  onToggle,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all"
      style={{
        backgroundColor: active ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-bg-tertiary)',
        color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${active ? 'rgba(59, 130, 246, 0.25)' : 'var(--color-border)'}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
