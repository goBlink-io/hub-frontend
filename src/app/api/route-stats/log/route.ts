import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/server/db';
import { createHmac } from 'crypto';
import { EVM_CHAIN_NAMES } from '@/lib/shared';
const ALL_CHAIN_NAMES = [...EVM_CHAIN_NAMES, 'near', 'solana', 'sui', 'aptos', 'starknet', 'ton', 'tron', 'bitcoin', 'litecoin', 'dogecoin', 'bitcoincash', 'stellar', 'xrp', 'cardano', 'aleo'];

export const dynamic = 'force-dynamic';

const VALID_CHAINS = new Set(ALL_CHAIN_NAMES);

/** Debounce: track last refresh_route_confidence call */
let lastRefreshAt = 0;
const REFRESH_DEBOUNCE_MS = 60_000; // 1 minute

function verifySignature(body: unknown, signature: string | null): boolean {
  const secret = process.env.STATS_SECRET;
  if (!secret) return false;
  if (!signature) return false;
  const expected = createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  return signature === expected;
}

/**
 * POST /api/route-stats/log
 * Log a completed swap for route confidence aggregation.
 * Called client-side when TransactionModal detects SUCCESS/FAILED/REFUNDED.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromChain, toChain, fromToken, toToken, success, durationSecs, amountUsd } = body;

    // Validate required fields
    if (!fromChain || !toChain || !fromToken || !toToken || typeof success !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate HMAC signature
    const signature = request.headers.get('x-stats-signature');
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
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
