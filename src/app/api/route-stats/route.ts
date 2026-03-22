import { NextRequest, NextResponse } from 'next/server';
import { anonSupabase as supabase } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/route-stats?from_chain=X&to_chain=Y&from_token=A&to_token=B
 * Returns aggregated confidence data for a specific route.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromChain = searchParams.get('from_chain');
    const toChain = searchParams.get('to_chain');
    const fromToken = searchParams.get('from_token');
    const toToken = searchParams.get('to_token');

    if (!fromChain || !toChain || !fromToken || !toToken) {
      return NextResponse.json({ error: 'Missing query params' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('route_confidence')
      .select('*')
      .eq('from_chain', fromChain)
      .eq('to_chain', toChain)
      .eq('from_token', fromToken)
      .eq('to_token', toToken)
      .maybeSingle();

    if (error) {
      console.error('Route stats query error:', error);
      return NextResponse.json({ stats: null });
    }

    return NextResponse.json({
      stats: data ? {
        totalSwaps: data.total_swaps,
        successRate: parseFloat(data.success_rate),
        avgDurationSecs: data.avg_duration_secs ? parseInt(data.avg_duration_secs, 10) : null,
        avgAmountUsd: data.avg_amount_usd ? parseFloat(data.avg_amount_usd) : null,
        lastSwapAt: data.last_swap_at,
      } : null,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  } catch {
    return NextResponse.json({ stats: null });
  }
}
