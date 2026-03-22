'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { TokenBalance } from '@/hooks/usePortfolio';
import { getChainMeta } from '@/lib/chain-meta';
import { getChainLogo } from '@/lib/chain-logos';

interface TokenRowProps {
  token: TokenBalance;
  /** Render as a card (mobile) or table row (desktop) */
  variant?: 'card' | 'row';
  onClick?: () => void;
}

function TokenLogo({ token }: { token: TokenBalance }) {
  const logo = getChainLogo(token.chain);
  const meta = getChainMeta(token.chain);

  if (token.logoUrl) {
    return (
      <div className="relative flex-shrink-0">
        <img
          src={token.logoUrl}
          alt={token.symbol}
          className="w-10 h-10 rounded-full"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div
          className="w-10 h-10 rounded-full items-center justify-center text-white font-bold text-sm hidden"
          style={{ background: meta.color }}
        >
          {token.symbol[0]}
        </div>
        {/* Chain badge */}
        {logo && (
          <img
            src={logo.icon}
            alt={meta.name}
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2"
            style={{ borderColor: 'var(--color-bg-secondary)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
        style={{ background: meta.color }}
      >
        {token.symbol[0]}
      </div>
    </div>
  );
}

function ChangeIndicator({ change }: { change: number }) {
  if (change === 0) return null;
  const positive = change > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = positive ? 'var(--success)' : 'var(--danger)';

  return (
    <span className="inline-flex items-center gap-0.5 text-tiny font-medium" style={{ color }}>
      <Icon className="h-3 w-3" />
      {Math.abs(change).toFixed(2)}%
    </span>
  );
}

function PortfolioBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-1 rounded-full" style={{ background: 'var(--color-bg-tertiary)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.max(percent, 0.5)}%`,
          background: 'var(--brand)',
          opacity: 0.7,
        }}
      />
    </div>
  );
}

const usdFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/* ─── Card Variant (Mobile) ─── */

function TokenCard({ token, onClick }: TokenRowProps) {
  const meta = getChainMeta(token.chain);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl transition-colors"
      style={{ background: 'var(--elevated)', minHeight: '44px' }}
    >
      <div className="flex items-center gap-3">
        <TokenLogo token={token} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {token.symbol}
            </span>
            <span className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {usdFmt.format(token.usdValue)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: meta.color }}
              />
              <span className="text-tiny" style={{ color: 'var(--text-muted)' }}>
                {meta.name}
              </span>
            </div>
            <span className="text-tiny" style={{ color: 'var(--text-muted)' }}>
              {token.balanceFormatted} {token.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <ChangeIndicator change={token.change24h} />
            <span className="text-tiny" style={{ color: 'var(--text-muted)' }}>
              {token.portfolioPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1.5">
            <PortfolioBar percent={token.portfolioPercent} />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Table Row Variant (Desktop) ─── */

function TokenTableRow({ token, onClick }: TokenRowProps) {
  const meta = getChainMeta(token.chain);

  return (
    <tr
      onClick={onClick}
      className="group transition-colors cursor-pointer"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Token */}
      <td className="py-3 pr-3">
        <div className="flex items-center gap-3">
          <TokenLogo token={token} />
          <div>
            <div className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {token.name}
            </div>
            <div className="text-tiny" style={{ color: 'var(--text-muted)' }}>
              {token.symbol}
            </div>
          </div>
        </div>
      </td>
      {/* Chain */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
          <span className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{meta.name}</span>
        </div>
      </td>
      {/* Balance */}
      <td className="py-3 px-3 text-right">
        <span className="text-body-sm" style={{ color: 'var(--text-primary)' }}>
          {token.balanceFormatted}
        </span>
      </td>
      {/* USD Value */}
      <td className="py-3 px-3 text-right">
        <span className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {usdFmt.format(token.usdValue)}
        </span>
      </td>
      {/* 24h Change */}
      <td className="py-3 px-3 text-right">
        <ChangeIndicator change={token.change24h} />
      </td>
      {/* % of Portfolio */}
      <td className="py-3 pl-3 text-right">
        <div className="flex items-center gap-2 justify-end">
          <span className="text-tiny" style={{ color: 'var(--text-muted)' }}>
            {token.portfolioPercent.toFixed(1)}%
          </span>
          <div className="w-16">
            <PortfolioBar percent={token.portfolioPercent} />
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ─── Export ─── */

export function TokenRow(props: TokenRowProps) {
  if (props.variant === 'row') return <TokenTableRow {...props} />;
  return <TokenCard {...props} />;
}
