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
