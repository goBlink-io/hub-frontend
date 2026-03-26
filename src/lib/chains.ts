// Re-export from local shared module
export {
  EVM_CHAINS,
  EVM_CHAIN_NAMES,
  NATIVE_TOKEN_SYMBOLS,
  isEvmChain,
  isNativeToken,
  getExplorerTxUrl,
  getExplorerAddressUrl,
} from '@/lib/shared';

export type { ChainConfig } from '@/lib/shared';

// Supported chains for the swap form and chain selectors
export const SUPPORTED_CHAINS = [
  { id: 'aptos', name: 'Aptos', type: 'aptos' as const },
  { id: 'arbitrum', name: 'Arbitrum', type: 'evm' as const },
  { id: 'base', name: 'Base', type: 'evm' as const },
  { id: 'bsc', name: 'BNB Chain', type: 'evm' as const },
  { id: 'ethereum', name: 'Ethereum', type: 'evm' as const },
  { id: 'near', name: 'NEAR', type: 'near' as const },
  { id: 'optimism', name: 'Optimism', type: 'evm' as const },
  { id: 'polygon', name: 'Polygon', type: 'evm' as const },
  { id: 'solana', name: 'Solana', type: 'solana' as const },
  { id: 'starknet', name: 'Starknet', type: 'starknet' as const },
  { id: 'sui', name: 'Sui', type: 'sui' as const },
  { id: 'tron', name: 'Tron', type: 'tron' as const },
] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];
