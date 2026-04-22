import { NextRequest } from 'next/server';
import { getSuiBalance } from '@/lib/server/sui';
import { errorResponse, successResponse } from '@/lib/api-response';
import { isValidSuiAddress } from '@/lib/validators';
import { logger } from '@/lib/logger';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const ip = getClientIp(_request);
    if (isRateLimited(`bal-sui:${ip}`, { max: 30, windowMs: 60_000 })) {
      return errorResponse('Too many requests', 429);
    }

    const { address } = await params;

    // Validate Sui address format
    if (!isValidSuiAddress(address)) {
      return errorResponse('Invalid Sui address format (must be 0x followed by 64 hex characters)', 400, { code: 'INVALID_ADDRESS' });
    }

    const result = await getSuiBalance(address);

    return successResponse(result);
  } catch (error: unknown) {
    logger.error('[SUI_BALANCE_ERROR]', error);
    return errorResponse('Failed to fetch SUI balance', 500);
  }
}
