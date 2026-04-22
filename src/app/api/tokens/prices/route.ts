import { NextRequest, NextResponse } from 'next/server';
import * as oneclick from '@/lib/server/oneclick';
import { errorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

// Cache prices for 2 minutes
export const revalidate = 120;

/** Carry over the `price` field from 1Click API as `priceUsd` */
function extractPricing(token: Record<string, unknown>): { assetId: string; priceUsd?: string } {
  const price = token.price as number | undefined;
  const result: { assetId: string; priceUsd?: string } = {
    assetId: token.assetId as string,
  };
  if (price != null && price > 0) {
    result.priceUsd = String(price);
  }
  return result;
}

export async function GET(_request: NextRequest) {
  try {
    const ip = getClientIp(_request);
    if (isRateLimited(`token-prices:${ip}`, { max: 30, windowMs: 60_000 })) {
      return errorResponse('Too many requests', 429);
    }

    const rawTokens = await oneclick.getTokens();

    // Extract just the pricing data
    const prices = (rawTokens as Record<string, unknown>[]).map(extractPricing);

    return NextResponse.json(prices, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    });
  } catch (error: unknown) {
    logger.error('[PRICES_ERROR]', error);
    return errorResponse('Failed to fetch prices', 500);
  }
}
