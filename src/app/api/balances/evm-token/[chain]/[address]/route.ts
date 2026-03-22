import { NextRequest, NextResponse } from 'next/server';
import { getTokenBalance, getSupportedChains, type SupportedChain } from '@/lib/server/evm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chain: string; address: string }> }
) {
  try {
    const { chain, address } = await params;
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('tokenAddress');
    const decimals = searchParams.get('decimals');

    if (!tokenAddress) {
      return NextResponse.json({ error: 'tokenAddress is required' }, { status: 400 });
    }
    const supportedChains = getSupportedChains();
    if (!supportedChains.includes(chain)) {
      return NextResponse.json({ error: 'Unsupported chain', supportedChains }, { status: 400 });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }
    const parsedDecimals = decimals ? parseInt(decimals, 10) : undefined;
    if (parsedDecimals !== undefined && isNaN(parsedDecimals)) {
      return NextResponse.json({ error: 'Invalid decimals parameter' }, { status: 400 });
    }
    const result = await getTokenBalance(
      chain as SupportedChain, address, tokenAddress, parsedDecimals
    );
    return NextResponse.json(result);
  } catch (error: unknown) {
    // Return 200 with null balance — RPC failures are transient and shouldn't
    // surface as 500 errors. The client will treat null as "balance unavailable".
    console.warn('[evm-token] RPC error:', error);
    return NextResponse.json({ balance: null, balanceRaw: null, error: 'RPC error' }, { status: 200 });
  }
}
