'use client';

import type { AuditTier, TierConfig } from '@/types/audit';

interface TierSelectorProps {
  selectedTier: AuditTier;
  onSelect: (tier: AuditTier) => void;
  tiers: TierConfig[];
}

export function TierSelector({ selectedTier, onSelect, tiers }: TierSelectorProps) {
  return (
    <div className="animate-fade-up">
      <h2
        className="text-sm font-semibold mb-3"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Select Audit Tier
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiers.map((tier) => {
          const isSelected = selectedTier === tier.id;
          const isPopular = tier.id === 'full';
          return (
            <button
              key={tier.id}
              onClick={() => onSelect(tier.id)}
              className="relative flex flex-col p-4 text-left transition-all active:scale-[0.98]"
              style={{
                backgroundColor: isSelected
                  ? 'var(--color-primary-subtle)'
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
  );
}
