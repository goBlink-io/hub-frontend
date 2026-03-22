import { NextRequest, NextResponse } from 'next/server';
import { getTransaction, updateTransactionStatus } from '@/lib/server/transactions';
import { errorResponse, successResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transactions/[id]
 * Get a single transaction by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return errorResponse('Transaction ID is required', 400);
    }

    const result = await getTransaction(id);

    if (!result.success) {
      const statusCode = result.error === 'Transaction not found' ? 404 : 500;
      return errorResponse(result.error || 'Failed to fetch transaction', statusCode);
    }

    // Require depositAddress as query param — only the swap initiator knows it
    const depositAddress = new URL(request.url).searchParams.get('depositAddress');
    if (!depositAddress || depositAddress !== result.transaction?.deposit_address) {
      return errorResponse('Valid depositAddress query param required', 403);
    }

    return successResponse(result.transaction);
  } catch (error: unknown) {
    logger.error('[TRANSACTION_GET_ERROR]', error);
    return errorResponse('Failed to fetch transaction', 500);
  }
}

// Allowed terminal + in-progress statuses (guards against arbitrary writes)
const VALID_STATUSES = new Set(['pending', 'processing', 'completed', 'refunded', 'failed']);

/**
 * PATCH /api/transactions/[id]
 * Update status (and optional fields) for a transaction — called by the history
 * page after confirming real status from the 1Click execution-status API.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { depositAddress, status, amountOut, fulfillmentTxHash, refundTxHash } = body;

    if (!depositAddress || !status) {
      return errorResponse('depositAddress and status are required', 400);
    }

    // Verify ownership via depositAddress — only the swap initiator knows it
    const existingTx = await getTransaction(id);
    if (!existingTx.success || !existingTx.transaction) {
      return errorResponse('Transaction not found', 404);
    }

    if (existingTx.transaction.deposit_address !== depositAddress) {
      return errorResponse('Deposit address does not match transaction', 403);
    }

    if (!VALID_STATUSES.has(status)) {
      return errorResponse(`Invalid status. Allowed: ${[...VALID_STATUSES].join(', ')}`, 400);
    }

    const result = await updateTransactionStatus(depositAddress, {
      status,
      ...(amountOut && { amountOut }),
      ...(fulfillmentTxHash && { fulfillmentTxHash }),
      ...(refundTxHash && { refundTxHash }),
    });

    if (!result.success) {
      return errorResponse(result.error || 'Failed to update transaction', 500);
    }

    logger.info('[TRANSACTION_STATUS_UPDATED]', { id, status });
    return NextResponse.json({ success: true, status });
  } catch (error: unknown) {
    logger.error('[TRANSACTION_PATCH_ERROR]', error);
    return errorResponse('Failed to update transaction', 500);
  }
}
