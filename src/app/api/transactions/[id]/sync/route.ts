import { NextRequest } from 'next/server';
import { getTransaction, syncTransactionStatus } from '@/lib/server/transactions';
import { errorResponse, successResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const txResult = await getTransaction(id);
    if (!txResult.success || !txResult.transaction) {
      return errorResponse('Transaction not found', 404);
    }

    const depositAddress = txResult.transaction.deposit_address;
    if (!depositAddress) {
      return errorResponse('No deposit address to sync', 400);
    }

    const syncResult = await syncTransactionStatus(depositAddress);
    if (!syncResult.success) {
      return errorResponse(syncResult.error || 'Sync failed', 500);
    }

    return successResponse({ synced: true, transaction: syncResult.transaction });
  } catch (error: unknown) {
    logger.error('[TRANSACTION_SYNC_ERROR]', error);
    return errorResponse('Failed to sync transaction', 500);
  }
}
