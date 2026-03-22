import { NextRequest, NextResponse } from 'next/server';
import { getSuiCoins as getSuiAccountCoins } from '@/lib/server/sui';
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

    const result = await getSuiAccountCoins(address);
    return NextResponse.json({ address, ...result });
  } catch (error: unknown) {
    console.error('[sui-coins]', error);
    return NextResponse.json({ error: 'Failed to fetch Sui coins' }, { status: 500 });
  }
}
