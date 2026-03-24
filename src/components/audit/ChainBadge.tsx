'use client';

const CHAIN_COLORS: Record<string, { color: string; bg: string }> = {
  sui: { color: '#4DA2FF', bg: 'rgba(77, 162, 255, 0.12)' },
  aptos: { color: '#2DD8A3', bg: 'rgba(45, 216, 163, 0.12)' },
  evm: { color: '#627EEA', bg: 'rgba(98, 126, 234, 0.12)' },
  solana: { color: '#9945FF', bg: 'rgba(153, 69, 255, 0.12)' },
  near: { color: '#00EC97', bg: 'rgba(0, 236, 151, 0.12)' },
  auto: { color: 'var(--color-text-secondary)', bg: 'var(--color-bg-tertiary)' },
};

interface ChainBadgeProps {
  chain: string;
}

export function ChainBadge({ chain }: ChainBadgeProps) {
  const key = chain.toLowerCase();
  const { color, bg } = CHAIN_COLORS[key] ?? {
    color: 'var(--color-text-secondary)',
    bg: 'var(--color-bg-tertiary)',
  };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{
        color,
        backgroundColor: bg,
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {chain}
    </span>
  );
}
