import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { isValidNearAccount } from '@/lib/validators';
import { logger } from '@/lib/logger';

const NEAR_RPC_URL = process.env.NEAR_RPC_URL || 'https://rpc.fastnear.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const contractAddress = request.nextUrl.searchParams.get('contractAddress');
    const decimals = parseInt(request.nextUrl.searchParams.get('decimals') || '18', 10);

    if (!isValidNearAccount(accountId)) {
      return errorResponse('Invalid NEAR account ID', 400);
    }
    if (!contractAddress) {
      return errorResponse('contractAddress is required', 400);
    }

    const response = await fetch(NEAR_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'query',
        params: {
          request_type: 'call_function',
          finality: 'final',
          account_id: contractAddress,
          method_name: 'ft_balance_of',
          args_base64: btoa(JSON.stringify({ account_id: accountId })),
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const resultBytes = data.result?.result;
    if (!resultBytes) return successResponse({ balance: '0.00', accountId, contractAddress });

    const resultStr = String.fromCharCode(...resultBytes);
    const rawBalance = JSON.parse(resultStr);
    const amount = BigInt(rawBalance);
    const divisor = 10n ** BigInt(decimals);
    const balance = Number(amount) / Number(divisor);

    return successResponse({ balance: balance.toFixed(6), accountId, contractAddress });
  } catch (error: unknown) {
    logger.error('[NEAR_TOKEN_BALANCE_ERROR]', error);
    return errorResponse('Failed to fetch NEAR token balance', 500);
  }
}
