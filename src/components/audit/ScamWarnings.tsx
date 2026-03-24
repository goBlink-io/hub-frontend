'use client';

import { Skull, AlertTriangle, Tag } from 'lucide-react';
import type { ScamFlag } from '@/types/audit';

interface ScamWarningsProps {
  scamFlags: ScamFlag[];
}

const SEVERITY_STYLES: Record<ScamFlag['severity'], { color: string; bgOpacity: string }> = {
  critical: { color: 'var(--color-danger)', bgOpacity: '0.10' },
  high: { color: 'var(--color-warning)', bgOpacity: '0.08' },
  medium: { color: 'var(--color-warning)', bgOpacity: '0.06' },
  low: { color: 'var(--color-info)', bgOpacity: '0.06' },
};

function SeverityBadge({ severity }: { severity: ScamFlag['severity'] }) {
  const style = SEVERITY_STYLES[severity];
  return (
    <span
      className="text-[10px] font-bold uppercase px-1.5 py-0.5"
      style={{
        color: style.color,
        backgroundColor: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {severity}
    </span>
  );
}

function ScamFlagCard({ flag }: { flag: ScamFlag }) {
  const style = SEVERITY_STYLES[flag.severity];

  return (
    <div
      className="p-4 space-y-3"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: `1px solid ${style.color}`,
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle size={14} style={{ color: style.color, flexShrink: 0 }} />
          <span
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {flag.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SeverityBadge severity={flag.severity} />
          <span
            className="text-[10px] font-bold tabular-nums px-1.5 py-0.5"
            style={{
              color: style.color,
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {flag.confidence}%
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {flag.description}
      </p>

      {/* Code snippet */}
      <div className="space-y-1">
        {flag.lineNumber != null && (
          <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
            Line {flag.lineNumber}
          </span>
        )}
        <pre
          className="p-2 text-xs font-mono overflow-x-auto"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-secondary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {flag.matchedCode}
        </pre>
      </div>

      {/* Red flags */}
      {flag.redFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flag.redFlags.map((rf, i) => (
            <span
              key={i}
              className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5"
              style={{
                color: 'var(--color-danger)',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <Tag size={8} />
              {rf}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScamWarnings({ scamFlags }: ScamWarningsProps) {
  if (scamFlags.length === 0) {
    return (
      <div
        className="flex items-center gap-2 p-3"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
          ✅ No scam indicators detected
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Warning banner */}
      <div
        className="flex items-center gap-3 p-4"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <Skull size={20} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
        <div>
          <span
            className="text-sm font-bold block"
            style={{ color: 'var(--color-danger)' }}
          >
            ⚠️ {scamFlags.length} Scam Indicator{scamFlags.length !== 1 ? 's' : ''} Detected
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            This contract contains patterns commonly associated with scams or rug pulls.
          </span>
        </div>
      </div>

      {/* Flag cards */}
      {scamFlags.map((flag) => (
        <ScamFlagCard key={flag.patternId} flag={flag} />
      ))}
    </div>
  );
}
