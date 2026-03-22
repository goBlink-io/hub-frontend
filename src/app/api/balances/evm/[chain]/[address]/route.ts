import { NextRequest, NextResponse } from 'next/server';
import { getNativeBalance, getSupportedChains, type SupportedChain } from '@/lib/server/evm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chain: string; address: string }> }
) {
  try {
    const { chain, address } = await params;
    const supportedChains = getSupportedChains();
    if (!supportedChains.includes(chain)) {
      return NextResponse.json({ error: 'Unsupported chain', supportedChains }, { status: 400 });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid EVM address format' }, { status: 400 });
    }
    const result = await getNativeBalance(chain as SupportedChain, address);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[evm-balance]', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
