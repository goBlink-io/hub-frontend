/**
 * Chain metadata — colors, names, and short icons for portfolio charts
 */

export interface ChainMeta {
  name: string;
  color: string;
  icon: string;
}

export const CHAIN_META: Record<string, ChainMeta> = {
  ethereum: { name: 'Ethereum', color: '#627EEA', icon: 'ETH' },
  solana: { name: 'Solana', color: '#9945FF', icon: 'SOL' },
  sui: { name: 'Sui', color: '#4DA2FF', icon: 'SUI' },
  near: { name: 'NEAR', color: '#00C08B', icon: 'NEAR' },
  base: { name: 'Base', color: '#0052FF', icon: 'BASE' },
  arbitrum: { name: 'Arbitrum', color: '#28A0F0', icon: 'ARB' },
  bsc: { name: 'BNB Chain', color: '#F0B90B', icon: 'BNB' },
  avalanche: { name: 'Avalanche', color: '#E84142', icon: 'AVAX' },
  polygon: { name: 'Polygon', color: '#8247E5', icon: 'MATIC' },
  optimism: { name: 'Optimism', color: '#FF0420', icon: 'OP' },
  bitcoin: { name: 'Bitcoin', color: '#F7931A', icon: 'BTC' },
  berachain: { name: 'Berachain', color: '#7C3AED', icon: 'BERA' },
  monad: { name: 'Monad', color: '#6366F1', icon: 'MON' },
  gnosis: { name: 'Gnosis', color: '#3E6957', icon: 'xDAI' },
  aurora: { name: 'Aurora', color: '#78D64B', icon: 'ETH' },
  ton: { name: 'TON', color: '#0098EA', icon: 'TON' },
  tron: { name: 'Tron', color: '#FF0013', icon: 'TRX' },
  aptos: { name: 'Aptos', color: '#2DD8A3', icon: 'APT' },
};

export function getChainMeta(chain: string): ChainMeta {
  return CHAIN_META[chain.toLowerCase()] ?? {
    name: chain.charAt(0).toUpperCase() + chain.slice(1),
    color: '#6B7280',
    icon: chain.substring(0, 3).toUpperCase(),
  };
}
