'use client';

import { Shield, Sparkles, Loader2 } from 'lucide-react';

const STATIC_HERO_STATS = [
  '5 Chains Supported',
];

interface AuditHeroProps {
  auditCount: number;
  onDemo: () => void;
  demoLoading: boolean;
  showDemo: boolean;
}

export function AuditHero({ auditCount, onDemo, demoLoading, showDemo }: AuditHeroProps) {
  return (
    <>
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
          Automated security analysis for smart contracts.
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
                backgroundColor: stat.includes('Audited') ? 'var(--color-primary-subtle)' : 'var(--color-bg-tertiary)',
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
      {showDemo && (
        <div className="flex justify-center">
          <button
            onClick={onDemo}
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
    </>
  );
}
