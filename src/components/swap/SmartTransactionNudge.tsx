'use client';

import type { Nudge } from '@/hooks/useSmartFirstTransaction';
import { Hand, Globe, Zap, Smile, Lightbulb, X } from 'lucide-react';

interface SmartTransactionNudgeProps {
  nudge: Nudge;
  onDismiss: () => void;
  onUseSuggestion?: (amount: string) => void; // kept for API compat; button removed
}

const ICONS: Record<string, React.ReactNode> = {
  'first-ever': <Hand className="h-5 w-5" />,
  'first-chain': <Globe className="h-5 w-5" />,
  'first-large': <Zap className="h-5 w-5" />,
  'welcome-back': <Smile className="h-5 w-5" />,
};

const COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  'first-ever': {
    bg: 'var(--info-bg)',
    border: 'var(--brand)',
    text: 'var(--text-primary)',
    accent: 'var(--brand)',
  },
  'first-chain': {
    bg: 'var(--info-bg)',
    border: 'var(--brand)',
    text: 'var(--text-primary)',
    accent: 'var(--brand)',
  },
  'first-large': {
    bg: 'var(--warning-bg, rgba(234, 179, 8, 0.08))',
    border: 'var(--warning, #eab308)',
    text: 'var(--text-primary)',
    accent: 'var(--warning, #eab308)',
  },
  'welcome-back': {
    bg: 'var(--info-bg)',
    border: 'var(--brand)',
    text: 'var(--text-primary)',
    accent: 'var(--brand)',
  },
};

export default function SmartTransactionNudge({ nudge, onDismiss }: SmartTransactionNudgeProps) {
  const type = nudge.type || 'first-ever';
  const icon = ICONS[type] || <Lightbulb className="h-5 w-5" />;
  const colors = COLORS[type] || COLORS['first-ever'];

  return (
    <div
      className="rounded-xl p-3.5 mb-4 animate-fade-up"
      style={{
        background: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex-shrink-0 mt-0.5" style={{ color: colors.accent }}>{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-medium" style={{ color: colors.text }}>
            {nudge.message}
          </p>

          {/* Try-it button removed — message alone is sufficient */}
        </div>

        {nudge.dismissable && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-md transition-colors opacity-50 hover:opacity-100"
            style={{ color: colors.text }}
            title="Dismiss"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
