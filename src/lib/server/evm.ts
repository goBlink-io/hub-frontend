import { createPublicClient, http, formatUnits, type PublicClient, type Address, type Chain } from 'viem';
import { mainnet, polygon, optimism, arbitrum, base, bsc, gnosis, avalanche } from 'viem/chains';

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;

const berachain: Chain = {
  id: 80094, name: 'Berachain',
  nativeCurrency: { name: 'BERA', symbol: 'BERA', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.berachain.com'] } },
};

const monad: Chain = {
  id: 143, name: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.monad.xyz'] } },
};

const aurora: Chain = {
  id: 1313161554, name: 'Aurora',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.aurora.dev'] } },
};

const plasma: Chain = {
  id: 9745, name: 'Plasma',
  nativeCurrency: { name: 'XPL', symbol: 'XPL', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.plasma.cash'] } },
};

const xlayer: Chain = {
  id: 196, name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
};

const adi: Chain = {
  id: 36900, name: 'ADI Chain',
  nativeCurrency: { name: 'ADI', symbol: 'ADI', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.adichain.io'] } },
};

const CHAIN_CONFIGS: Record<string, { chain: Chain; rpcUrl: string }> = {
  ethereum: { chain: mainnet, rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com' },
  base: { chain: base, rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org' },
  arbitrum: { chain: arbitrum, rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc' },
  bsc: { chain: bsc, rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org' },
  polygon: { chain: polygon, rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com' },
  optimism: { chain: optimism, rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io' },
  avalanche: { chain: avalanche, rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc' },
  gnosis: { chain: gnosis, rpcUrl: process.env.GNOSIS_RPC_URL || 'https://rpc.gnosischain.com' },
  berachain: { chain: berachain, rpcUrl: process.env.BERACHAIN_RPC_URL || 'https://rpc.berachain.com' },
  monad: { chain: monad, rpcUrl: process.env.MONAD_RPC_URL || 'https://rpc.monad.xyz' },
  aurora: { chain: aurora, rpcUrl: process.env.AURORA_RPC_URL || 'https://mainnet.aurora.dev' },
  plasma: { chain: plasma, rpcUrl: process.env.PLASMA_RPC_URL || 'https://rpc.plasma.cash' },
  xlayer: { chain: xlayer, rpcUrl: process.env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech' },
  adi: { chain: adi, rpcUrl: process.env.ADI_RPC_URL || 'https://rpc.adichain.io' },
};

export type SupportedChain = keyof typeof CHAIN_CONFIGS;

const clientCache: Map<string, PublicClient> = new Map();

export function getSupportedChains(): string[] {
  return Object.keys(CHAIN_CONFIGS);
}

function getPublicClient(chainName: SupportedChain): PublicClient {
  if (clientCache.has(chainName)) return clientCache.get(chainName)!;
  const config = CHAIN_CONFIGS[chainName];
  if (!config) throw new Error(`Unsupported chain: ${chainName}`);
  // 5s timeout prevents Vercel serverless hangs on slow/unreliable public RPCs
  const client = createPublicClient({ chain: config.chain, transport: http(config.rpcUrl, { timeout: 5000 }) });
  clientCache.set(chainName, client as PublicClient);
  return client as PublicClient;
}

export async function getNativeBalance(chainName: SupportedChain, address: string) {
  const client = getPublicClient(chainName);
  const balanceWei = await client.getBalance({ address: address as Address });
  const config = CHAIN_CONFIGS[chainName];
  const nativeDecimals = config.chain.nativeCurrency?.decimals ?? 18;
  const balance = formatUnits(balanceWei, nativeDecimals);
  return {
    balance,
    balanceWei: balanceWei.toString(),
    address,
    chain: chainName,
  };
}

export async function getTokenBalance(
  chainName: SupportedChain, address: string, tokenAddress: string, decimals?: number
) {
  const client = getPublicClient(chainName);
  const balanceRaw = await client.readContract({
    address: tokenAddress as Address, abi: ERC20_ABI, functionName: 'balanceOf',
    args: [address as Address],
  });
  let tokenDecimals = decimals;
  if (tokenDecimals === undefined || tokenDecimals === null) {
    tokenDecimals = await client.readContract({
      address: tokenAddress as Address, abi: ERC20_ABI, functionName: 'decimals',
    }) as number;
  }
  const balance = formatUnits(balanceRaw as bigint, tokenDecimals);
  return {
    balance,
    balanceRaw: (balanceRaw as bigint).toString(),
    address, tokenAddress, chain: chainName, decimals: tokenDecimals,
  };
}
