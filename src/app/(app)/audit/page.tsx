'use client';

import { useState, useCallback, useEffect } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { FileUpload } from '@/components/audit/FileUpload';
import { AuditPayment } from '@/components/audit/AuditPayment';
import { AuditResults } from '@/components/audit/AuditResults';
import { RecentAudits } from '@/components/audit/RecentAudits';
import { AuditHero } from '@/components/audit/AuditHero';
import { AuditOptionsBar } from '@/components/audit/AuditOptions';
import { TierSelector } from '@/components/audit/TierSelector';
import { AuditProgress } from '@/components/audit/AuditProgress';
import { runAudit, fetchDemo, auditFromGithub } from '@/lib/audit-api';
import {
  loadAudits,
  saveAudit,
  deleteAudit,
  buildSavedAudit,
  type SavedAudit,
} from '@/lib/audit-storage';
import type { AuditChain, AuditOptions, AuditResponse, AuditTier, TierConfig } from '@/types/audit';

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

    try {
      const res = await runAudit(files, options);
      setResults(res);

      const saved = buildSavedAudit(res, selectedTier);
      saveAudit(saved);
      setRecentAudits(loadAudits());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      setLoading(false);
    }
  }, [files, options, selectedTier]);

  const handleGithubSubmit = useCallback(async (url: string) => {
    setGithubLoading(true);
    setError(null);

    try {
      const res = await auditFromGithub(url);
      setResults(res);

      const saved = buildSavedAudit(res, selectedTier);
      saveAudit(saved);
      setRecentAudits(loadAudits());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub audit failed');
    } finally {
      setGithubLoading(false);
    }
  }, [selectedTier]);

  const handleChainChange = useCallback((chain: AuditChain) => {
    setOptions((prev) => ({ ...prev, chain }));
  }, []);

  const toggleOption = useCallback(
    (key: 'irAnalysis' | 'patternMatching' | 'aiSpecs') => {
      setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const handleTierSelect = useCallback((tier: AuditTier) => {
    setSelectedTier(tier);
    setOptions((prev) => ({
      ...prev,
      irAnalysis: tier !== 'quick',
      aiSpecs: tier === 'deep',
    }));
  }, []);

  const handleSelectAudit = useCallback((auditResults: AuditResponse) => {
    setResults(auditResults);
  }, []);

  const handleDeleteAudit = useCallback((id: string) => {
    deleteAudit(id);
    setRecentAudits(loadAudits());
  }, []);

  const currentTier = AUDIT_TIERS.find((t) => t.id === selectedTier);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Smart Contract Audit</h1>
      <AuditHero
        auditCount={auditCount}
        onDemo={handleDemo}
        demoLoading={demoLoading}
        showDemo={!results}
      />

      {/* Demo banner */}
      {isDemo && results && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-primary-subtle)',
            border: '1px solid var(--color-primary-muted)',
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
        <AuditOptionsBar
          options={options}
          onChainChange={handleChainChange}
          onToggle={toggleOption}
        />
      )}

      {/* Tier Selection */}
      {files.length > 0 && !results && !paid && (
        <TierSelector
          selectedTier={selectedTier}
          onSelect={handleTierSelect}
          tiers={AUDIT_TIERS}
        />
      )}

      {/* Email notification for Deep Audit */}
      {files.length > 0 && !results && selectedTier === 'deep' && (
        <div className="card p-4 sm:p-5 animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={14} style={{ color: 'var(--color-primary)' }} />
            <label
              htmlFor="audit-notify-email"
              className="text-xs font-semibold"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Get notified when your audit is complete
            </label>
          </div>
          <input
            id="audit-notify-email"
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
              priceUsd={currentTier?.price || '249'}
              tierName={currentTier?.name || 'Full Audit'}
            />
          ) : (
            <AuditProgress
              loading={loading}
              error={error}
              onRun={handleRunAudit}
              disabled={files.length === 0}
              notifyEmail={notifyEmail}
              tierName={currentTier?.name || 'Full Audit'}
            />
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
