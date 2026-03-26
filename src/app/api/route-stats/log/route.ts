import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/server/db';
import { EVM_CHAIN_NAMES } from '@/lib/shared';
const ALL_CHAIN_NAMES = [...EVM_CHAIN_NAMES, 'near', 'solana', 'sui', 'aptos', 'starknet', 'ton', 'tron', 'bitcoin', 'litecoin', 'dogecoin', 'bitcoincash', 'stellar', 'xrp', 'cardano', 'aleo'];

export const dynamic = 'force-dynamic';

const VALID_CHAINS = new Set(ALL_CHAIN_NAMES);

// Simple rate limiter — 30 logs per minute per IP
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const ipCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now >= entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

/** Debounce: track last refresh_route_confidence call */
let lastRefreshAt = 0;
const REFRESH_DEBOUNCE_MS = 60_000; // 1 minute

/**
 * POST /api/route-stats/log
 * Log a completed swap for route confidence aggregation.
 * Called client-side when TransactionModal detects SUCCESS/FAILED/REFUNDED.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const body = await request.json();
    const { fromChain, toChain, fromToken, toToken, success, durationSecs, amountUsd } = body;

    // Validate required fields
    if (!fromChain || !toChain || !fromToken || !toToken || typeof success !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate chain IDs
    if (!VALID_CHAINS.has(fromChain) || !VALID_CHAINS.has(toChain)) {
      return NextResponse.json({ error: 'Invalid chain ID' }, { status: 400 });
    }

    // Validate amountUsd if provided
    if (amountUsd != null) {
      const amt = Number(amountUsd);
      if (!Number.isFinite(amt) || amt <= 0 || amt > 1_000_000) {
        return NextResponse.json({ error: 'Invalid amountUsd' }, { status: 400 });
      }
    }

    // Validate durationSecs if provided
    if (durationSecs != null) {
      const dur = Number(durationSecs);
      if (!Number.isFinite(dur) || dur < 1 || dur > 300) {
        return NextResponse.json({ error: 'Invalid durationSecs' }, { status: 400 });
      }
    }

    const { error } = await supabase.from('route_stats').insert({
      from_chain: fromChain,
      to_chain: toChain,
      from_token: fromToken,
      to_token: toToken,
      success,
      duration_secs: durationSecs ?? null,
      amount_usd: amountUsd ?? null,
    });

    if (error) {
      console.error('Failed to log route stat:', error);
      // Don't fail the user experience — this is analytics
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    // Refresh materialized view with debounce (max once per minute)
    const now = Date.now();
    if (now - lastRefreshAt >= REFRESH_DEBOUNCE_MS) {
      lastRefreshAt = now;
      void Promise.resolve(supabase.rpc('refresh_route_confidence')).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
