'use client';

import { useState, useMemo } from 'react';
import type { ChainBalance } from '@/hooks/usePortfolio';
import { formatUsd } from '@/hooks/usePortfolio';
import { getChainMeta } from '@/lib/chain-meta';

interface ChainDonutProps {
  breakdown: ChainBalance[];
  totalValueUsd: number;
}

export function ChainDonut({ breakdown, totalValueUsd }: ChainDonutProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const segments = useMemo(() => {
    if (breakdown.length === 0) return [];

    const SIZE = 100;
    const RADIUS = 40;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    let offset = 0;

    return breakdown.map((chain, i) => {
      const fraction = chain.percent / 100;
      const dashLength = fraction * CIRCUMFERENCE;
      const gap = CIRCUMFERENCE - dashLength;
      const segment = {
        ...chain,
        dashArray: `${dashLength} ${gap}`,
        dashOffset: -offset,
        cx: SIZE / 2,
        cy: SIZE / 2,
        r: RADIUS,
        index: i,
      };
      offset += dashLength;
      return segment;
    });
  }, [breakdown]);

  const hovered = hoveredIdx !== null ? breakdown[hoveredIdx] : null;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="w-44 h-44 md:w-52 md:h-52"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background ring */}
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="var(--color-bg-tertiary)"
          strokeWidth="12"
        />

        {/* Chain segments */}
        {segments.map((seg) => (
          <circle
            key={seg.chain}
            cx={seg.cx}
            cy={seg.cy}
            r={seg.r}
            fill="none"
            stroke={seg.color}
            strokeWidth={hoveredIdx === seg.index ? 14 : 12}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="butt"
            className="transition-all duration-200"
            style={{
              opacity: hoveredIdx !== null && hoveredIdx !== seg.index ? 0.4 : 1,
              cursor: 'pointer',
            }}
            onMouseEnter={() => setHoveredIdx(seg.index)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {hovered ? (
          <>
            <span className="text-tiny font-semibold" style={{ color: hovered.color }}>
              {getChainMeta(hovered.chain).name}
            </span>
            <span className="text-body-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatUsd(hovered.totalUsd)}
            </span>
            <span className="text-tiny" style={{ color: 'var(--text-muted)' }}>
              {hovered.percent.toFixed(1)}%
            </span>
          </>
        ) : (
          <>
            <span className="text-tiny" style={{ color: 'var(--text-muted)' }}>Total</span>
            <span className="text-body-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatUsd(totalValueUsd)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
