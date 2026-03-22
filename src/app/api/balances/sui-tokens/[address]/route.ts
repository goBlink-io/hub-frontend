import { NextRequest, NextResponse } from 'next/server';
import { getSuiCoins as getSuiAccountTokens } from '@/lib/server/sui';
import { isValidSuiAddress } from '@/lib/validators';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!isValidSuiAddress(address)) {
      return NextResponse.json({ error: 'Invalid Sui address format' }, { status: 400 });
    }

    const tokens = await getSuiAccountTokens(address);
    return NextResponse.json({ address, tokens, count: tokens.length });
  } catch (error: unknown) {
    console.error('[sui-tokens]', error);
    return NextResponse.json({ error: 'Failed to fetch Sui tokens' }, { status: 500 });
  }
}
