'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { RecentAudits } from '@/components/audit/RecentAudits';
import { runAudit, fetchDemo, auditFromGithub } from '@/lib/audit-api';
import { Mail } from 'lucide-react';
import {
  loadAudits,
  saveAudit,
  deleteAudit,
  buildSavedAudit,
  type SavedAudit,
} from '@/lib/audit-storage';
import type { AuditChain, AuditOptions, AuditResponse } from '@/types/audit';

type AuditTier = 'quick' | 'full' | 'deep';

interface TierConfig {
  id: AuditTier;
  name: string;
  price: string;
  description: string;
  features: string[];
}

const AUDIT_TIERS: TierConfig[] = [
  {
    id: 'quick',
    name: 'Quick Scan',
    price: '99',
    description: 'Pattern matching & summary report',
    features: ['105 vulnerability patterns', 'Summary report', 'Chain detection', 'Instant results'],
  },
  {
    id: 'full',
    name: 'Full Audit',
    price: '249',
    description: 'IR analysis + formal verification',
    features: [
      'Everything in Quick Scan',
      'Formal verification (Z3)',
      'Spec inference',
      'Full detailed report',
      'Exploit mapping',
    ],
  },
  {
    id: 'deep',
    name: 'Deep Audit',
    price: '499',
    description: 'Complete analysis + AI specs',
    features: [
      'Everything in Full Audit',
      'AI spec generation',
      'Cross-module analysis',
      'Downloadable PDF report',
      'Priority processing',
    ],
  },
];

const CHAINS: Array<{ id: AuditChain; label: string }> = [
  { id: 'auto', label: 'Auto-Detect' },
  { id: 'sui', label: 'Sui' },
  { id: 'aptos', label: 'Aptos' },
  { id: 'evm', label: 'EVM' },
  { id: 'solana', label: 'Solana' },
  { id: 'near', label: 'NEAR' },
];

const STATIC_HERO_STATS = [
  '105 Patterns',
  '150+ Exploits Tracked',
  '5 Chains',
  '$56B+ Losses Analyzed',
];

export default function AuditPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedTier, setSelectedTier] = useState<AuditTier>('full');
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
  const [recentAudits, setRecentAudits] = useState<SavedAudit[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [githubLoading, setGithubLoading] = useState(false);
  const [auditCount, setAuditCount] = useState<number>(0);

  // Load recent audits + live audit counter on mount
  useEffect(() => {
    setRecentAudits(loadAudits());

    // Fetch live audit counter
    const ZION_API = process.env.NEXT_PUBLIC_ZION_API_URL || 'http://localhost:3900';
    fetch(`${ZION_API}/api/stats`)
      .then((res) => res.json())
      .then((data: { auditsPerformed?: number }) => {
        const target = data.auditsPerformed ?? 0;
        if (target > 0) {
          const duration = 1200;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const pct = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - pct, 3);
            setAuditCount(Math.round(eased * target));
            if (pct < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      })
      .catch(() => { /* counter stays at 0 */ });
  }, []);

  const handleDemo = useCallback(async () => {
    setDemoLoading(true);
    setError(null);
    setIsDemo(true);
    try {
      const res = await fetchDemo();
      setResults(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo failed');
      setIsDemo(false);
    } finally {
      setDemoLoading(false);
    }
  }, []);

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

      // Save to localStorage
      const saved = buildSavedAudit(res, selectedTier);
      saveAudit(saved);
      setRecentAudits(loadAudits());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [files, options, selectedTier]);

  const handleGithubSubmit = useCallback(async (url: string) => {
    setGithubLoading(true);
    setError(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 10, 90));
    }, 800);

    try {
      const res = await auditFromGithub(url);
      setProgress(100);
      setResults(res);

      const saved = buildSavedAudit(res, selectedTier);
      saveAudit(saved);
      setRecentAudits(loadAudits());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub audit failed');
    } finally {
      clearInterval(interval);
      setGithubLoading(false);
    }
  }, [selectedTier]);

  const toggleOption = useCallback(
    (key: 'irAnalysis' | 'patternMatching' | 'aiSpecs') => {
      setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const handleSelectAudit = useCallback((auditResults: AuditResponse) => {
    setResults(auditResults);
  }, []);

  const handleDeleteAudit = useCallback((id: string) => {
    deleteAudit(id);
    setRecentAudits(loadAudits());
  }, []);

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
          {[
            ...(auditCount > 0 ? [`${auditCount} Contracts Audited`] : []),
            ...STATIC_HERO_STATS,
          ].map((stat) => (
            <span
              key={stat}
              className="text-xs font-medium px-2 py-1 tabular-nums"
              style={{
                color: stat.includes('Audited') ? 'var(--color-primary)' : 'var(--color-text-muted)',
                backgroundColor: stat.includes('Audited') ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: stat.includes('Audited') ? 700 : undefined,
              }}
            >
              {stat}
            </span>
          ))}
        </div>
      </div>

      {/* Demo Button */}
      {!results && (
        <div className="flex justify-center">
          <button
            onClick={handleDemo}
            disabled={demoLoading}
            className="flex items-center gap-2"
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-primary)',
              backgroundColor: 'transparent',
              border: '1.5px solid var(--color-primary)',
              borderRadius: 'var(--radius-lg)',
              cursor: demoLoading ? 'not-allowed' : 'pointer',
              opacity: demoLoading ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {demoLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {demoLoading ? 'Loading demo...' : 'See it in action — Try Free Demo'}
          </button>
        </div>
      )}

      {/* Demo banner */}
      {isDemo && results && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}
          >
            This is a demo audit of{' '}
            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Solmate&apos;s ERC20
            </span>
            . Upload your own contract for a full audit.
          </p>
        </div>
      )}

      {/* Upload Zone */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-h4 mb-4">Upload Contracts</h2>
        <FileUpload onFilesChange={setFiles} onGithubSubmit={handleGithubSubmit} />
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

      {/* Tier Selection */}
      {files.length > 0 && !results && !paid && (
        <div className="animate-fade-up">
          <h2
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Select Audit Tier
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AUDIT_TIERS.map((tier) => {
              const isSelected = selectedTier === tier.id;
              const isPopular = tier.id === 'full';
              return (
                <button
                  key={tier.id}
                  onClick={() => {
                    setSelectedTier(tier.id);
                    setOptions((prev) => ({
                      ...prev,
                      irAnalysis: tier.id !== 'quick',
                      aiSpecs: tier.id === 'deep',
                    }));
                  }}
                  className="relative flex flex-col p-4 text-left transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(59, 130, 246, 0.06)'
                      : 'var(--color-bg-secondary)',
                    border: `1.5px solid ${
                      isSelected ? 'var(--color-primary)' : 'var(--color-border)'
                    }`,
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  {isPopular && (
                    <span
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        color: '#fff',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      Popular
                    </span>
                  )}
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{
                      color: isSelected
                        ? 'var(--color-primary)'
                        : 'var(--color-text-muted)',
                    }}
                  >
                    {tier.name}
                  </span>
                  <span
                    className="text-2xl font-bold mt-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    ${tier.price}
                  </span>
                  <span
                    className="text-xs mt-1 mb-3"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {tier.description}
                  </span>
                  <ul className="space-y-1.5">
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        className="text-xs flex items-start gap-1.5"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        <span style={{ color: 'var(--color-success)' }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Email notification for Deep Audit */}
      {files.length > 0 && !results && selectedTier === 'deep' && (
        <div className="card p-4 sm:p-5 animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={14} style={{ color: 'var(--color-primary)' }} />
            <span
              className="text-xs font-semibold"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Get notified when your audit is complete
            </span>
          </div>
          <input
            type="email"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
            placeholder="your@email.com (optional)"
            className="input w-full h-9 text-sm"
          />
        </div>
      )}

      {/* Payment & Run */}
      {files.length > 0 && !results && (
        <div className="card p-5 sm:p-6 animate-fade-up">
          {!paid ? (
            <AuditPayment
              onPaymentComplete={() => setPaid(true)}
              priceUsd={AUDIT_TIERS.find((t) => t.id === selectedTier)?.price || '249'}
              tierName={AUDIT_TIERS.find((t) => t.id === selectedTier)?.name || 'Full Audit'}
            />
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
                <>
                  <button
                    onClick={handleRunAudit}
                    disabled={files.length === 0}
                    className="btn btn-primary w-full h-12 text-sm gap-2"
                  >
                    <Shield size={16} />
                    Run Audit
                  </button>
                  {notifyEmail && selectedTier === 'deep' && (
                    <p
                      className="text-xs text-center"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      We&apos;ll email your results to {notifyEmail}
                    </p>
                  )}
                </>
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

      {/* GitHub loading state */}
      {githubLoading && (
        <div className="card p-5 sm:p-6 animate-fade-up">
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
              Cloning repository and running audit...
            </p>
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
          </div>
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

      {/* Results */}
      {results && <AuditResults results={results} />}

      {/* Recent Audits */}
      {!results && (
        <RecentAudits
          audits={recentAudits}
          onSelect={handleSelectAudit}
          onDelete={handleDeleteAudit}
        />
      )}
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
