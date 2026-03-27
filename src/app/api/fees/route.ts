import { NextRequest, NextResponse } from 'next/server';
import { getFeeTiers } from '@/lib/server/fees';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(`fees:${ip}`, { max: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const tiers = getFeeTiers();

  return NextResponse.json({
    tiers: tiers.map(t => ({
      maxAmountUsd: t.maxAmountUsd,
      percent: (t.bps / 100).toFixed(2),
      bps: t.bps,
      label: t.maxAmountUsd === null
        ? 'Whale'
        : t.maxAmountUsd <= 5000
          ? 'Standard'
          : 'Pro',
    })),
    summary: tiers.map((t, i) => ({
      range: t.maxAmountUsd === null
        ? `Over $${(tiers[i - 1]?.maxAmountUsd ?? 0).toLocaleString()}`
        : i === 0
          ? `Under $${t.maxAmountUsd.toLocaleString()}`
          : `$${(tiers[i - 1]?.maxAmountUsd ?? 0).toLocaleString()} – $${t.maxAmountUsd.toLocaleString()}`,
      rate: `${(t.bps / 100).toFixed(2)}%`,
    })),
  });
}
