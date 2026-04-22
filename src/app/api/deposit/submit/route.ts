import { NextRequest } from 'next/server';
import * as oneclick from '@/lib/server/oneclick';
import { errorResponse, successResponse } from '@/lib/api-response';
import { isValidTxHash } from '@/lib/validators';
import { logger } from '@/lib/logger';
import { logAudit, getClientIp } from '@/lib/server/audit';
import { isRateLimited, getClientIp as getRateLimitIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getRateLimitIp(request);
    if (isRateLimited(`deposit-submit:${ip}`, { max: 10, windowMs: 60_000 })) {
      return errorResponse('Too many requests', 429);
    }

    const { txHash, depositAddress } = await request.json();

    // Input validation
    if (!txHash || !depositAddress) {
      return errorResponse('txHash and depositAddress are required', 400);
    }

    // Validate txHash format
    if (!isValidTxHash(txHash)) {
      return errorResponse('Invalid transaction hash format', 400);
    }

    // Validate depositAddress format (basic length check)
    if (typeof depositAddress !== 'string' || depositAddress.length < 10 || depositAddress.length > 128) {
      return errorResponse('Invalid deposit address format', 400);
    }

    // Submit to 1Click API
    try {
      const result = await oneclick.submitDeposit(txHash, depositAddress);

      const ip = getClientIp(request.headers);
      logAudit({
        actor: ip,
        action: 'deposit.submitted',
        metadata: { depositAddress, txHash },
        ipAddress: ip,
      });

      return successResponse({
        message: 'Transaction submitted successfully',
        txHash,
        depositAddress,
        ...result,
      });
    } catch (error: unknown) {
      // Log the actual error server-side
      logger.error('[SUBMIT_ERROR]', {
        txHash,
        depositAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return honest error to client
      return errorResponse(
        'Failed to submit transaction to tracking service',
        503,
        {
          code: 'SUBMIT_FAILED',
          details: 'Your transaction may still process. Check status in a few minutes.',
        }
      );
    }
  } catch (error: unknown) {
    logger.error('[SUBMIT_PARSE_ERROR]', error);
    return errorResponse('Invalid request format', 400);
  }
}
