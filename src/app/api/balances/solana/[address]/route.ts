import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { isValidSolanaAddress } from '@/lib/validators';
import { logger } from '@/lib/logger';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const ip = getClientIp(_request);
    if (isRateLimited(`bal-sol:${ip}`, { max: 30, windowMs: 60_000 })) {
      return errorResponse('Too many requests', 429);
    }

    const { address } = await params;
    if (!isValidSolanaAddress(address)) {
      return errorResponse('Invalid Solana address format', 400);
    }

    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    const lamports = data?.result?.value || 0;
    return successResponse({ balance: String(lamports / 1e9), balanceLamports: lamports.toString(), address });
  } catch (error: unknown) {
    logger.error('[SOLANA_BALANCE_ERROR]', error);
    return errorResponse('Failed to fetch SOL balance', 500);
  }
}
