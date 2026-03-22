import { NextRequest } from 'next/server';
import { searchTransactions } from '@/lib/server/transactions';
import { verifyAdmin } from '@/lib/server/admin-auth';
import { errorResponse, successResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transactions/search?q=...
 * Search transactions by wallet address, deposit address, or tx hash
 * Restricted to authenticated admin users
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication — this endpoint is for customer support
    const admin = await verifyAdmin();
    if (!admin) {
      return errorResponse('Unauthorized', 401, { code: 'UNAUTHORIZED' });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 3) {
      return errorResponse('Search query must be at least 3 characters', 400);
    }

    const result = await searchTransactions(query);

    if (!result.success) {
      return errorResponse(result.error || 'Search failed', 500);
    }

    logger.info('[TRANSACTION_SEARCH]', { query, resultsCount: result.transactions?.length || 0 });
    return successResponse({
      transactions: result.transactions || [],
      query,
    });
  } catch (error: unknown) {
    logger.error('[TRANSACTION_SEARCH_ERROR]', error);
    return errorResponse('Search failed', 500);
  }
}
