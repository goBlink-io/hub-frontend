/**
 * Chain logos — SVG data URIs for all 29 supported chains
 * Using official brand colors and simplified logos
 */

export interface ChainLogo {
  name: string;
  icon: string; // URL or SVG data URI
  color: string; // Primary brand color (hex)
  bgColor: string; // Light background for badges
}

// Helper to create simple SVG circle logos with text
const svgLogo = (letter: string, bg: string, fg: string = '#fff') =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${bg}"/><text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="${fg}" font-size="16" font-weight="bold" font-family="system-ui,sans-serif">${letter}</text></svg>`)}`;

export const CHAIN_LOGOS: Record<string, ChainLogo> = {
  // === EVM Chains ===
  ethereum: {
    name: 'Ethereum',
    icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    color: '#627EEA',
    bgColor: '#EEF0FB',
  },
  base: {
    name: 'Base',
    icon: 'https://assets.coingecko.com/asset_platforms/images/131/small/base.png',
    color: '#0052FF',
    bgColor: '#E6EEFF',
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
    color: '#28A0F0',
    bgColor: '#E8F4FE',
  },
  bsc: {
    name: 'BNB Chain',
    icon: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    color: '#F0B90B',
    bgColor: '#FEF7E0',
  },
  polygon: {
    name: 'Polygon',
    icon: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
    color: '#8247E5',
    bgColor: '#F0EAFC',
  },
  optimism: {
    name: 'Optimism',
    icon: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
    color: '#FF0420',
    bgColor: '#FFE6E9',
  },
  avalanche: {
    name: 'Avalanche',
    icon: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    color: '#E84142',
    bgColor: '#FDE8E8',
  },
  gnosis: {
    name: 'Gnosis',
    icon: 'https://assets.coingecko.com/coins/images/662/small/logo_square_simple_300px.png',
    color: '#3E6957',
    bgColor: '#E8F0EC',
  },
  berachain: {
    name: 'Berachain',
    icon: svgLogo('🐻', '#7C3AED'),
    color: '#7C3AED',
    bgColor: '#F0E8FD',
  },
  monad: {
    name: 'Monad',
    icon: svgLogo('M', '#6366F1'),
    color: '#6366F1',
    bgColor: '#ECEAFD',
  },
  aurora: {
    name: 'Aurora',
    icon: 'https://assets.coingecko.com/coins/images/20326/small/AURORA.png',
    color: '#78D64B',
    bgColor: '#EFFBE8',
  },
  plasma: {
    name: 'Plasma',
    icon: svgLogo('P', '#EC4899'),
    color: '#EC4899',
    bgColor: '#FDE8F3',
  },
  xlayer: {
    name: 'X Layer',
    icon: svgLogo('X', '#000000'),
    color: '#000000',
    bgColor: '#E8E8E8',
  },
  adi: {
    name: 'ADI Chain',
    icon: svgLogo('A', '#0EA5E9'),
    color: '#0EA5E9',
    bgColor: '#E6F6FE',
  },

  // === Non-EVM Chains (with wallets) ===
  near: {
    name: 'NEAR',
    icon: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
    color: '#00C08B',
    bgColor: '#E6F9F3',
  },
  solana: {
    name: 'Solana',
    icon: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    color: '#9945FF',
    bgColor: '#F2E8FF',
  },
  sui: {
    name: 'Sui',
    icon: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
    color: '#4DA2FF',
    bgColor: '#E8F2FF',
  },
  aptos: {
    name: 'Aptos',
    icon: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
    color: '#2DD8A3',
    bgColor: '#E8FAF4',
  },
  starknet: {
    name: 'Starknet',
    icon: svgLogo('⚡', '#29296E'),
    color: '#29296E',
    bgColor: '#E8E8F4',
  },
  ton: {
    name: 'TON',
    icon: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png',
    color: '#0098EA',
    bgColor: '#E6F4FD',
  },
  tron: {
    name: 'Tron',
    icon: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
    color: '#FF0013',
    bgColor: '#FFE6E8',
  },

  // === Destination-only chains ===
  bitcoin: {
    name: 'Bitcoin',
    icon: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    color: '#F7931A',
    bgColor: '#FEF3E2',
  },
  litecoin: {
    name: 'Litecoin',
    icon: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
    color: '#345D9D',
    bgColor: '#E8ECF4',
  },
  dogecoin: {
    name: 'Dogecoin',
    icon: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
    color: '#C3A634',
    bgColor: '#FAF5E0',
  },
  bitcoincash: {
    name: 'Bitcoin Cash',
    icon: 'https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png',
    color: '#0AC18E',
    bgColor: '#E6F9F2',
  },
  stellar: {
    name: 'Stellar',
    icon: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
    color: '#000000',
    bgColor: '#E8E8E8',
  },
  xrp: {
    name: 'XRP Ledger',
    icon: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    color: '#23292F',
    bgColor: '#E8EAEB',
  },
  cardano: {
    name: 'Cardano',
    icon: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
    color: '#0033AD',
    bgColor: '#E6EAFA',
  },
  aleo: {
    name: 'Aleo',
    icon: svgLogo('A', '#00C0F0'),
    color: '#00C0F0',
    bgColor: '#E6F8FE',
  },
};

/**
 * Get chain logo by chain ID (case-insensitive)
 */
export function getChainLogo(chainId: string): ChainLogo | null {
  return CHAIN_LOGOS[chainId.toLowerCase()] || null;
}

/**
 * Get all chains grouped by type
 */
export function getChainsByType() {
  const walletChains = [
    'ethereum', 'base', 'arbitrum', 'bsc', 'polygon', 'optimism', 'avalanche',
    'gnosis', 'berachain', 'monad', 'aurora', 'plasma', 'xlayer', 'adi',
    'near', 'solana', 'sui', 'aptos', 'starknet', 'ton', 'tron',
  ];
  const destinationOnly = [
    'bitcoin', 'litecoin', 'dogecoin', 'bitcoincash',
    'stellar', 'xrp', 'cardano', 'aleo',
  ];

  return {
    wallet: walletChains.map(id => ({ id, ...CHAIN_LOGOS[id] })),
    destinationOnly: destinationOnly.map(id => ({ id, ...CHAIN_LOGOS[id] })),
    all: [...walletChains, ...destinationOnly].map(id => ({ id, ...CHAIN_LOGOS[id] })),
  };
}
