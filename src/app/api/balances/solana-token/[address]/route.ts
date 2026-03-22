import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { isValidSolanaAddress } from '@/lib/validators';
import { logger } from '@/lib/logger';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const mint = request.nextUrl.searchParams.get('mint');

    if (!isValidSolanaAddress(address)) {
      return errorResponse('Invalid Solana address format', 400);
    }
    if (!mint) {
      return errorResponse('mint parameter is required', 400);
    }

    // Get token accounts
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [address, { mint }, { encoding: 'jsonParsed' }],
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    const accounts = data?.result?.value || [];

    if (accounts.length === 0) {
      return successResponse({ balance: '0.00', address, mint });
    }

    const info = accounts[0]?.account?.data?.parsed?.info;
    const rawAmount = BigInt(info?.tokenAmount?.amount || '0');
    const decimals = info?.tokenAmount?.decimals || 6;
    const balance = Number(rawAmount) / Math.pow(10, decimals);

    return successResponse({ balance: balance.toString(), address, mint });
  } catch (error: unknown) {
    logger.error('[SOLANA_TOKEN_BALANCE_ERROR]', error);
    return errorResponse('Failed to fetch SPL token balance', 500);
  }
}
