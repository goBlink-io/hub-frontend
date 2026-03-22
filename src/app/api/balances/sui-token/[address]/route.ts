import { NextRequest, NextResponse } from 'next/server';
import { getSuiTokenBalance } from '@/lib/server/sui';
import { isValidSuiAddress } from '@/lib/validators';

const COIN_TYPE_RE = /^0x[a-fA-F0-9]+::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_]*$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!isValidSuiAddress(address)) {
      return NextResponse.json({ error: 'Invalid Sui address format' }, { status: 400 });
    }

    const coinType = new URL(request.url).searchParams.get('coinType');
    if (!coinType) {
      return NextResponse.json({ error: 'coinType query parameter is required' }, { status: 400 });
    }

    if (!COIN_TYPE_RE.test(coinType)) {
      return NextResponse.json({ error: 'Invalid coinType format (expected 0x<hex>::<module>::<name>)' }, { status: 400 });
    }

    const result = await getSuiTokenBalance(address, coinType);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[sui-token]', error);
    return NextResponse.json({ error: 'Failed to fetch Sui token balance' }, { status: 500 });
  }
}
