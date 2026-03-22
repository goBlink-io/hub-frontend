import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

/**
 * Proxy RPC calls to Solana (browser → our server → Solana RPC).
 * Required because Solana public RPCs block browser requests with 403.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error('[SOLANA_RPC_PROXY_ERROR]', error);
    return NextResponse.json({ error: 'RPC proxy error' }, { status: 500 });
  }
}
