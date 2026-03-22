import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { isValidNearAccount } from '@/lib/validators';
import { logger } from '@/lib/logger';

const NEAR_RPC_URL = process.env.NEAR_RPC_URL || 'https://rpc.fastnear.com';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    if (!isValidNearAccount(accountId)) {
      return errorResponse('Invalid NEAR account ID', 400);
    }

    const response = await fetch(NEAR_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'view_account', finality: 'final', account_id: accountId } }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Account not found');

    const amountYocto = BigInt(data.result.amount);
    const yoctoPerNear = 10n ** 24n;
    const whole = amountYocto / yoctoPerNear;
    const fraction = amountYocto % yoctoPerNear;
    const balance = Number(whole) + Number(fraction) / Number(yoctoPerNear);

    return successResponse({ balance: balance.toFixed(6), accountId });
  } catch (error: unknown) {
    logger.error('[NEAR_BALANCE_ERROR]', error);
    return errorResponse('Failed to fetch NEAR balance', 500);
  }
}
