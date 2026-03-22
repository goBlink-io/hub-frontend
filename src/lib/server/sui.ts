/**
 * Sui RPC helper for server-side balance queries.
 */

const SUI_RPC_URL = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io';

async function suiRpc(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(SUI_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export async function getSuiBalance(address: string): Promise<string> {
  const result = await suiRpc('suix_getBalance', [address]) as { totalBalance: string };
  const mist = BigInt(result.totalBalance || '0');
  return (Number(mist) / 1e9).toFixed(6);
}

export async function getSuiTokenBalance(address: string, coinType: string): Promise<string> {
  const result = await suiRpc('suix_getBalance', [address, coinType]) as { totalBalance: string };
  const raw = BigInt(result.totalBalance || '0');
  // Default to 9 decimals for Sui tokens — exact decimals should be passed when available
  return (Number(raw) / 1e9).toFixed(6);
}

export async function getSuiCoins(address: string): Promise<{ coinType: string; balance: string }[]> {
  const result = await suiRpc('suix_getAllBalances', [address]) as Array<{ coinType: string; totalBalance: string }>;
  return (result || []).map(c => ({
    coinType: c.coinType,
    balance: (Number(BigInt(c.totalBalance || '0')) / 1e9).toFixed(6),
  }));
}
