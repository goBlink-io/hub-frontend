import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function GET() {
  try {
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash', params: [{ commitment: 'confirmed' }] }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return NextResponse.json({
      blockhash: data.result.value.blockhash,
      lastValidBlockHeight: data.result.value.lastValidBlockHeight,
    });
  } catch (error: unknown) {
    logger.error('[SOLANA_BLOCKHASH_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch blockhash' }, { status: 500 });
  }
}
