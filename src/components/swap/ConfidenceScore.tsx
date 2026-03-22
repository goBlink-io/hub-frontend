'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shield, Clock, Zap, TrendingUp, BarChart3 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConfidenceScoreProps {
  timeEstimate: number | null;     // seconds from quote
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amountUsd?: number | null;
  quoteAvailable: boolean;         // Did we get a valid quote?
}

interface RouteStats {
  totalSwaps: number;
  successRate: number;
  avgDurationSecs: number | null;
  avgAmountUsd: number | null;
  lastSwapAt: string;
}

interface ScoreResult {
  score: number;        // 0–100
  label: string;        // "Excellent" | "Good" | "Fair"
  color: string;        // CSS color
  bgColor: string;      // Background
  signals: Signal[];
}

interface Signal {
  icon: React.ReactNode;
  text: string;
  positive: boolean;
}

// ── Scoring logic ──────────────────────────────────────────────────────────────

// Well-established routes with high liquidity
const HIGH_LIQUIDITY_PAIRS = new Set([
  'ethereum-near', 'near-ethereum',
  'ethereum-solana', 'solana-ethereum',
  'ethereum-base', 'base-ethereum',
  'ethereum-arbitrum', 'arbitrum-ethereum',
  'ethereum-polygon', 'polygon-ethereum',
  'ethereum-bsc', 'bsc-ethereum',
  'near-solana', 'solana-near',
  'near-base', 'base-near',
  'near-arbitrum', 'arbitrum-near',
]);

// Stablecoins are the most reliable routes
const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'USDC.e', 'BUSD']);

function calculateScore(props: ConfidenceScoreProps, routeStats: RouteStats | null): ScoreResult | null {
  if (!props.quoteAvailable) return null;

  let score = 0;
  const signals: Signal[] = [];

  // ── Phase 2: Real data takes priority when available ──
  if (routeStats && routeStats.totalSwaps >= 3) {
    // Success rate (up to 40 points)
    const srPoints = Math.round(routeStats.successRate * 0.4);
    score += srPoints;
    signals.push({
      icon: <BarChart3 className="h-3.5 w-3.5" />,
      text: `${routeStats.successRate}% of transfers on this route succeed`,
      positive: routeStats.successRate >= 95,
    });

    // Real avg duration (up to 25 points)
    if (routeStats.avgDurationSecs !== null) {
      const durPoints = routeStats.avgDurationSecs <= 30 ? 25 : routeStats.avgDurationSecs <= 60 ? 20 : routeStats.avgDurationSecs <= 180 ? 15 : 10;
      score += durPoints;
      signals.push({
        icon: <Clock className="h-3.5 w-3.5" />,
        text: `Avg. completion: ${routeStats.avgDurationSecs}s`,
        positive: routeStats.avgDurationSecs <= 60,
      });
    }

    // Route activity bonus (up to 20 points)
    const hoursSinceLastSwap = (Date.now() - new Date(routeStats.lastSwapAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastSwap < 24) {
      score += 20;
      signals.push({
        icon: <Zap className="h-3.5 w-3.5" />,
        text: 'Route active in the last 24h',
        positive: true,
      });
    } else if (hoursSinceLastSwap < 72) {
      score += 10;
    }

    // Stablecoin bonus (up to 15 points)
    if (STABLECOINS.has(props.fromToken) || STABLECOINS.has(props.toToken)) {
      score += 15;
      signals.push({
        icon: <Shield className="h-3.5 w-3.5" />,
        text: 'Stablecoin — price stays steady during transfer',
        positive: true,
      });
    }
  } else {
    // ── Phase 1: Heuristic scoring (no real data yet) ──

    // 1. Quote availability (base score)
    score += 40;
    signals.push({
      icon: <Zap className="h-3.5 w-3.5" />,
      text: 'This route is live and ready to go',
      positive: true,
    });

    // 2. Time estimate quality
    if (props.timeEstimate !== null) {
      if (props.timeEstimate <= 30) {
        score += 25;
        signals.push({
          icon: <Clock className="h-3.5 w-3.5" />,
          text: `Should arrive in ~${props.timeEstimate}s — very fast`,
          positive: true,
        });
      } else if (props.timeEstimate <= 60) {
        score += 20;
        signals.push({
          icon: <Clock className="h-3.5 w-3.5" />,
          text: `Should arrive in ~${props.timeEstimate}s`,
          positive: true,
        });
      } else if (props.timeEstimate <= 180) {
        score += 10;
        signals.push({
          icon: <Clock className="h-3.5 w-3.5" />,
          text: `May take ~${Math.round(props.timeEstimate / 60)} minutes`,
          positive: true,
        });
      } else {
        score += 5;
        signals.push({
          icon: <Clock className="h-3.5 w-3.5" />,
          text: `Longer route — allow ~${Math.round(props.timeEstimate / 60)} minutes`,
          positive: false,
        });
      }
    }

    // 3. Route liquidity (known high-volume pairs)
    const pairKey = `${props.fromChain}-${props.toChain}`;
    if (HIGH_LIQUIDITY_PAIRS.has(pairKey)) {
      score += 20;
      signals.push({
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        text: 'Popular route — lots of transfers use this path',
        positive: true,
      });
    } else {
      score += 10;
    }

    // 4. Stablecoin bonus
    if (STABLECOINS.has(props.fromToken) || STABLECOINS.has(props.toToken)) {
      score += 15;
      signals.push({
        icon: <Shield className="h-3.5 w-3.5" />,
        text: 'Stablecoin — price stays steady during transfer',
        positive: true,
      });
    } else {
      score += 5;
    }
  }

  // Cap at 100
  score = Math.min(100, score);

  // Label + colors
  let label: string;
  let color: string;
  let bgColor: string;

  if (score >= 85) {
    label = 'Excellent';
    color = 'var(--color-success)';
    bgColor = 'var(--success-bg, rgba(34,197,94,0.08))';
  } else if (score >= 65) {
    label = 'Good';
    color = 'var(--brand, #2563eb)';
    bgColor = 'var(--info-bg, rgba(37,99,235,0.08))';
  } else {
    label = 'Fair';
    color = 'var(--warning, #eab308)';
    bgColor = 'var(--warning-bg, rgba(234,179,8,0.08))';
  }

  return { score, label, color, bgColor, signals };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ConfidenceScore(props: ConfidenceScoreProps) {
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);

  // Fetch real route stats (Phase 2) — fails gracefully
  useEffect(() => {
    if (!props.quoteAvailable || !props.fromChain || !props.toChain || !props.fromToken || !props.toToken) return;
    const params = new URLSearchParams({
      from_chain: props.fromChain,
      to_chain: props.toChain,
      from_token: props.fromToken,
      to_token: props.toToken,
    });
    fetch(`/api/route-stats?${params}`)
      .then(r => r.json())
      .then(data => setRouteStats(data.stats || null))
      .catch(() => setRouteStats(null));
  }, [props.fromChain, props.toChain, props.fromToken, props.toToken, props.quoteAvailable]);

  const result = useMemo(() => calculateScore(props, routeStats), [
    props.timeEstimate,
    props.fromChain,
    props.toChain,
    props.fromToken,
    props.toToken,
    props.quoteAvailable,
    routeStats,
  ]);

  if (!result) return null;

  return (
    <div className="rounded-xl p-3.5 mb-4" style={{ background: result.bgColor, borderLeft: `3px solid ${result.color}` }}>
      {/* Score header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" style={{ color: result.color }} />
          <span className="text-body-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Transfer looks {result.label.toLowerCase()}
          </span>
        </div>
        <span className="text-caption font-semibold px-2 py-0.5 rounded-full" style={{ background: result.bgColor, color: result.color }}>
          {result.label}
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(0,0,0,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${result.score}%`,
            background: result.color,
          }}
        />
      </div>

      {/* Signals */}
      <div className="space-y-1.5">
        {result.signals.map((signal, i) => (
          <div key={i} className="flex items-center gap-2">
            <span style={{ color: signal.positive ? result.color : 'var(--color-text-muted)' }}>
              {signal.icon}
            </span>
            <span className="text-caption" style={{ color: 'var(--color-text-secondary)' }}>
              {signal.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
