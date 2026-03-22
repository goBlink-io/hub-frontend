import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, getTransactionsByWallet } from '@/lib/server/transactions';
import { errorResponse, successResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { logAudit, getClientIp } from '@/lib/server/audit';

export const dynamic = 'force-dynamic';

// Basic wallet address format validation
function isValidWalletAddress(address: string): boolean {
  if (!address || address.length < 10 || address.length > 128) return false;
  // Reject obviously invalid characters
  return /^[a-zA-Z0-9._\-:]+$/.test(address);
}

/**
 * POST /api/transactions
 * Create a new transaction record when swap is initiated
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      walletChain,
      depositAddress,
      fromChain,
      fromToken,
      toChain,
      toToken,
      amountIn,
      amountOut,
      amountUsd,
      recipient,
      refundTo,
      status,
      depositTxHash,
      feeBps,
      feeAmount,
      quoteId,
      source,
      paymentRequestId,
    } = body;

    // Validate required fields
    if (!walletAddress || !walletChain || !fromChain || !fromToken || !toChain || !toToken || !amountIn || !recipient) {
      return errorResponse('Missing required fields', 400, {
        details: { required: ['walletAddress', 'walletChain', 'fromChain', 'fromToken', 'toChain', 'toToken', 'amountIn', 'recipient'] }
      });
    }

    // Validate wallet address format
    if (!isValidWalletAddress(walletAddress)) {
      return errorResponse('Invalid wallet address format', 400);
    }

    // Require depositAddress — serves as correlation key for anonymous swaps
    if (!depositAddress) {
      return errorResponse('depositAddress is required', 400);
    }

    // TODO: Associate with authenticated user when auth is implemented
    const userId: string | null = null;

    const result = await createTransaction({
      walletAddress,
      walletChain,
      depositAddress,
      fromChain,
      fromToken,
      toChain,
      toToken,
      amountIn,
      amountOut,
      amountUsd,
      recipient,
      refundTo,
      status,
      depositTxHash,
      feeBps,
      feeAmount,
      quoteId,
      source,
      paymentRequestId,
      ...(userId ? { userId } : {}),
    });

    if (!result.success) {
      return errorResponse(result.error || 'Failed to create transaction', 500);
    }

    logger.info('[TRANSACTION_API_CREATE]', { id: result.transaction?.id, walletAddress });

    const ip = getClientIp(request.headers);
    logAudit({
      actor: userId || ip,
      action: 'transaction.recorded',
      resourceId: result.transaction?.id,
      ipAddress: ip,
    });

    return successResponse(result.transaction, 201);
  } catch (error: unknown) {
    logger.error('[TRANSACTION_API_ERROR]', error);
    return errorResponse('Failed to create transaction', 500);
  }
}

/**
 * GET /api/transactions?wallet=0x...&page=1&limit=20&status=pending
 * Get transaction history for a wallet
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || undefined;

    if (!wallet) {
      return errorResponse('Wallet address is required', 400);
    }

    // Validate pagination
    if (page < 1 || page > 1000) {
      return errorResponse('Invalid page number (1-1000)', 400);
    }

    if (limit < 1 || limit > 100) {
      return errorResponse('Invalid limit (1-100)', 400);
    }

    // Support comma-separated wallet addresses (multi-wallet history)
    const wallets = wallet.split(',').map(w => w.trim()).filter(Boolean).slice(0, 10);
    const result = await getTransactionsByWallet(wallets.length === 1 ? wallets[0] : wallets, { page, limit, status });

    if (!result.success) {
      return errorResponse(result.error || 'Failed to fetch transactions', 500);
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: result.transactions || [],
        total: result.total || 0,
        page,
        limit,
        totalPages: Math.ceil((result.total || 0) / limit),
      },
    });
  } catch (error: unknown) {
    logger.error('[TRANSACTION_API_GET_ERROR]', error);
    return errorResponse('Failed to fetch transactions', 500);
  }
}
