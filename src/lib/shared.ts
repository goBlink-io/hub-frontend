/**
 * @goblink/shared stub — types and utilities that the source goblink.io imports
 * from @goblink/shared. Inlined here to avoid adding a dependency.
 */

export type ChainType = 'EVM' | 'NEAR' | 'SOLANA' | 'SUI' | 'TON' | 'BITCOIN' | 'TRON' | 'STELLAR' | 'STARKNET' | 'XRP' | 'DOGE' | 'LITECOIN' | 'BITCOIN_CASH' | 'APTOS';

export interface Token {
  assetId: string;
  symbol: string;
  name?: string;
  decimals: number;
  icon?: string;
  chain?: ChainType;
  blockchain?: string;
  contractAddress?: string;
  defuseAssetId?: string;
  address?: string;
  price?: number;
  priceUsd?: string;
  priceUpdatedAt?: string;
}

export type SwapStatus = 'PENDING_QUOTE' | 'PENDING_DEPOSIT' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'INCOMPLETE_DEPOSIT';

export interface FeeTier {
  maxAmountUsd: number | null;
  bps: number;
}

export interface ChainConfig {
  id: number;
  name: string;
  displayName: string;
  nativeToken: { symbol: string; name: string; decimals: number };
  explorer: string;
  rpcUrls: string[];
  testnet?: boolean;
}

export const EVM_CHAINS: Record<string, ChainConfig> = {
  ethereum: { id: 1, name: 'ethereum', displayName: 'Ethereum', nativeToken: { symbol: 'ETH', name: 'Ether', decimals: 18 }, explorer: 'https://etherscan.io', rpcUrls: ['https://eth.llamarpc.com'] },
  base: { id: 8453, name: 'base', displayName: 'Base', nativeToken: { symbol: 'ETH', name: 'Ether', decimals: 18 }, explorer: 'https://basescan.org', rpcUrls: ['https://mainnet.base.org'] },
  arbitrum: { id: 42161, name: 'arbitrum', displayName: 'Arbitrum One', nativeToken: { symbol: 'ETH', name: 'Ether', decimals: 18 }, explorer: 'https://arbiscan.io', rpcUrls: ['https://arb1.arbitrum.io/rpc'] },
  bsc: { id: 56, name: 'bsc', displayName: 'BNB Chain', nativeToken: { symbol: 'BNB', name: 'BNB', decimals: 18 }, explorer: 'https://bscscan.com', rpcUrls: ['https://bsc-dataseed1.binance.org'] },
  polygon: { id: 137, name: 'polygon', displayName: 'Polygon', nativeToken: { symbol: 'POL', name: 'POL', decimals: 18 }, explorer: 'https://polygonscan.com', rpcUrls: ['https://polygon-rpc.com'] },
  optimism: { id: 10, name: 'optimism', displayName: 'Optimism', nativeToken: { symbol: 'ETH', name: 'Ether', decimals: 18 }, explorer: 'https://optimistic.etherscan.io', rpcUrls: ['https://mainnet.optimism.io'] },
  avalanche: { id: 43114, name: 'avax', displayName: 'Avalanche', nativeToken: { symbol: 'AVAX', name: 'AVAX', decimals: 18 }, explorer: 'https://snowtrace.io', rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'] },
  gnosis: { id: 100, name: 'gnosis', displayName: 'Gnosis', nativeToken: { symbol: 'xDAI', name: 'xDAI', decimals: 18 }, explorer: 'https://gnosisscan.io', rpcUrls: ['https://rpc.gnosischain.com'] },
  berachain: { id: 80094, name: 'berachain', displayName: 'Berachain', nativeToken: { symbol: 'BERA', name: 'BERA', decimals: 18 }, explorer: 'https://berascan.com', rpcUrls: ['https://rpc.berachain.com'] },
  monad: { id: 143, name: 'monad', displayName: 'Monad', nativeToken: { symbol: 'MON', name: 'MON', decimals: 18 }, explorer: 'https://explorer.monad.xyz', rpcUrls: ['https://rpc.monad.xyz'] },
  aurora: { id: 1313161554, name: 'aurora', displayName: 'Aurora', nativeToken: { symbol: 'ETH', name: 'Ether', decimals: 18 }, explorer: 'https://explorer.aurora.dev', rpcUrls: ['https://mainnet.aurora.dev'] },
  plasma: { id: 9745, name: 'plasma', displayName: 'Plasma', nativeToken: { symbol: 'XPL', name: 'XPL', decimals: 18 }, explorer: 'https://explorer.plasma.cash', rpcUrls: ['https://rpc.plasma.cash'] },
  xlayer: { id: 196, name: 'xlayer', displayName: 'X Layer', nativeToken: { symbol: 'OKB', name: 'OKB', decimals: 18 }, explorer: 'https://www.oklink.com/xlayer', rpcUrls: ['https://rpc.xlayer.tech'] },
  adi: { id: 36900, name: 'adi', displayName: 'ADI Chain', nativeToken: { symbol: 'ADI', name: 'ADI', decimals: 18 }, explorer: 'https://explorer.adichain.io', rpcUrls: ['https://rpc.adichain.io'] },
};

export const EVM_CHAIN_NAMES = Object.keys(EVM_CHAINS);
export const NATIVE_TOKEN_SYMBOLS = ['ETH', 'BNB', 'POL', 'BERA', 'MON', 'AVAX', 'xDAI', 'OKB', 'XPL', 'ADI'];

export function isEvmChain(blockchain: string): boolean {
  return EVM_CHAIN_NAMES.includes(blockchain.toLowerCase());
}

export function isNativeToken(symbol: string): boolean {
  return NATIVE_TOKEN_SYMBOLS.includes(symbol);
}

export function getExplorerTxUrl(chain: string, txHash: string): string {
  const key = chain.toLowerCase();
  const evmConfig = EVM_CHAINS[key];
  if (evmConfig) return `${evmConfig.explorer}/tx/${txHash}`;
  const paths: Record<string, string> = {
    near: 'https://nearblocks.io/txns/', solana: 'https://solscan.io/tx/',
    sui: 'https://suiscan.xyz/mainnet/tx/', bitcoin: 'https://mempool.space/tx/',
    tron: 'https://tronscan.org/#/transaction/', ton: 'https://tonviewer.com/transaction/',
    aptos: 'https://aptoscan.com/txn/', starknet: 'https://starkscan.co/tx/',
  };
  if (paths[key]) return `${paths[key]}${txHash}`;
  return `https://etherscan.io/tx/${txHash}`;
}

export function getExplorerAddressUrl(chain: string, address: string): string {
  const key = chain.toLowerCase();
  const evmConfig = EVM_CHAINS[key];
  if (evmConfig) return `${evmConfig.explorer}/address/${address}`;
  return `https://nearblocks.io/address/${address}`;
}
