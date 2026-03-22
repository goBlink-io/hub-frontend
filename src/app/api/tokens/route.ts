import { NextRequest, NextResponse } from 'next/server';
import * as oneclick from '@/lib/server/oneclick';
import tokenIcons from '@/data/token-icons.json';
import { errorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// Cache token list for 5 minutes
export const revalidate = 300;

function applyIcons(tokens: Record<string, unknown>[]): void {
  for (const token of tokens) {
    const normalizedSymbol = (token.symbol as string).replace(/\.(omft|omdep)$/i, '');
    const iconUrl = (tokenIcons as Record<string, string>)[normalizedSymbol];
    if (iconUrl) token.icon = iconUrl;
  }
}

/** User-facing symbol overrides (hide wrapped token names) */
const SYMBOL_OVERRIDES: Record<string, string> = {
  'wNEAR': 'NEAR',
};

/** Remove pricing fields — clients should fetch from /api/tokens/prices separately */
function removePricing(token: Record<string, unknown>): void {
  delete token.price;
  delete token.priceUsd;
  delete token.priceUpdatedAt;
}

/**
 * Deduplicate NEAR tokens by symbol — the 1Click API returns one entry per bridge variant
 * (e.g. USDT exists as native, ETH-omft, SOL-omft, ARB-omft, etc.). We pick one canonical
 * entry per symbol using priority: native NEAR > eth-omft > any omft > Rainbow bridge.
 */
function deduplicateNearTokens(tokens: Record<string, unknown>[]): Record<string, unknown>[] {
  const bySymbol = new Map<string, Record<string, unknown>[]>();

  for (const token of tokens) {
    const sym = ((token.symbol as string) || '').replace(/\.(omft|omdep)$/i, '');
    if (!bySymbol.has(sym)) bySymbol.set(sym, []);
    bySymbol.get(sym)!.push(token);
  }

  const result: Record<string, unknown>[] = [];
  for (const [, group] of bySymbol) {
    if (group.length === 1) { result.push(group[0]); continue; }

    // Primary score: lower = more canonical
    const score = (assetId: string): number => {
      const id = assetId.toLowerCase();
      // Native NEAR contracts — no bridge suffix
      if (!id.includes('.omft.near') && !id.includes('.omdep.near') && !id.includes('.bridge.near') && !id.includes('factory.bridge')) return 0;
      // ETH-chain ERC-20 omft (e.g. nep141:eth-0x....omft.near) — deepest liquidity
      if (id.startsWith('nep141:eth-') && id.endsWith('.omft.near')) return 1;
      // Chain-native omft (e.g. nep141:eth.omft.near, nep141:btc.omft.near) — no dash
      if (/^nep141:[a-z0-9]+\.omft\.near$/.test(id)) return 2;
      // Any other omft/omdep bridge variant
      if (id.endsWith('.omft.near') || id.endsWith('.omdep.near')) return 3;
      // Old Rainbow bridge (.bridge.near / factory.bridge.near)
      return 4;
    };
    // Secondary: among ties, prefer Ethereum-chain variants (deepest liquidity)
    const chainPref = (assetId: string): number => {
      const id = assetId.toLowerCase();
      if (id.startsWith('nep141:eth')) return 0;
      if (id.startsWith('nep141:sol')) return 1;
      if (id.startsWith('nep141:base')) return 2;
      return 9;
    };

    group.sort((a, b) => {
      const ds = score(a.assetId as string) - score(b.assetId as string);
      return ds !== 0 ? ds : chainPref(a.assetId as string) - chainPref(b.assetId as string);
    });
    result.push(group[0]);
  }

  return result;
}

// Map 1Click API chain prefixes → our blockchain names
const CHAIN_PREFIX_MAP: Record<string, string> = {
  'eth': 'ethereum', 'base': 'base', 'arb': 'arbitrum',
  'bera': 'berachain', 'sol': 'solana', 'sui': 'sui',
  'gnosis': 'gnosis', 'tron': 'tron', 'starknet': 'starknet',
  'cardano': 'cardano', 'aptos': 'aptos', 'aleo': 'aleo',
};

// Native token asset IDs per chain
const NATIVE_TOKEN_MAP: Record<string, [string, string]> = {
  'ethereum': ['native', '0x0000000000000000000000000000000000000000'],
  'base': ['native', '0x0000000000000000000000000000000000000000'],
  'arbitrum': ['native', '0x0000000000000000000000000000000000000000'],
  'optimism': ['native', '0x0000000000000000000000000000000000000000'],
  'avalanche': ['native', '0x0000000000000000000000000000000000000000'],
  'gnosis': ['native', '0x0000000000000000000000000000000000000000'],
  'berachain': ['native', '0x0000000000000000000000000000000000000000'],
  'monad': ['native', '0x0000000000000000000000000000000000000000'],
  'aurora': ['native', '0x0000000000000000000000000000000000000000'],
  'polygon': ['native', '0x0000000000000000000000000000000000000000'],
  'bsc': ['native', '0x0000000000000000000000000000000000000000'],
  'solana': ['So11111111111111111111111111111111111111112', 'So11111111111111111111111111111111111111112'],
  'sui': ['0x2::sui::SUI', '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'],
};

const BLOCKCHAIN_ALIASES: Record<string, string> = {
  'sol': 'solana', 'pol': 'polygon', 'op': 'optimism', 'avax': 'avalanche',
};

export async function GET(_request: NextRequest) {
  try {
    const rawTokens = await oneclick.getTokens();

    const nearTokens: Record<string, unknown>[] = [];
    const nativeChainTokens: Record<string, unknown>[] = [];

    (rawTokens as Record<string, unknown>[]).forEach((token) => {
      const assetId = token.assetId as string;
      const apiBlockchain = BLOCKCHAIN_ALIASES[token.blockchain as string] || token.blockchain || 'near';

      if (assetId.startsWith('nep141:')) {
        nearTokens.push({ ...token, blockchain: 'near' });

        // Create native-chain representations for cross-chain tokens
        if (assetId.includes('.omft.near') || assetId.includes('.omdep.near')) {
          const match = assetId.match(/^nep141:([a-z]+)[-\.]/);
          if (match) {
            const targetBlockchain = CHAIN_PREFIX_MAP[match[1]];
            if (targetBlockchain) {
              const isNativeToken = assetId.match(/^nep141:[a-z]+\.omft\.near$/);
              let nativeAssetId: string, contractAddress: string;

              if (isNativeToken) {
                const entry = NATIVE_TOKEN_MAP[targetBlockchain];
                if (!entry) return;
                [nativeAssetId, contractAddress] = entry;
              } else if (token.contractAddress) {
                nativeAssetId = token.contractAddress as string;
                contractAddress = token.contractAddress as string;
              } else {
                return;
              }

              nativeChainTokens.push({
                ...token,
                assetId: nativeAssetId,
                defuseAssetId: assetId,
                blockchain: targetBlockchain,
                contractAddress,
                address: contractAddress,
              });
            }
          }
        }
      } else if (assetId.startsWith('nep245:')) {
        const isNativeHot = assetId.includes('_11111111111111111111');
        const chainIdMatch = assetId.match(/:(\d+)_/);
        const hotChainId = chainIdMatch ? parseInt(chainIdMatch[1], 10) : null;
        const HOT_CHAIN_ID_MAP: Record<number, string> = {
          56: 'bsc', 137: 'polygon', 10: 'optimism', 43114: 'avalanche',
          143: 'monad', 196: 'xlayer', 9745: 'plasma', 36900: 'adi',
          1117: 'ton', 1100: 'stellar',
        };
        const resolvedBlockchain = (hotChainId && HOT_CHAIN_ID_MAP[hotChainId]) || apiBlockchain;

        if (isNativeHot && hotChainId) {
          nativeChainTokens.push({
            ...token,
            assetId: 'native',
            defuseAssetId: assetId,
            blockchain: resolvedBlockchain,
            contractAddress: '0x0000000000000000000000000000000000000000',
            address: '0x0000000000000000000000000000000000000000',
          });
        } else {
          nativeChainTokens.push({
            ...token,
            blockchain: resolvedBlockchain,
            defuseAssetId: assetId,
            contractAddress: token.contractAddress || undefined,
            address: token.contractAddress || undefined,
          });
        }
      } else if (assetId.startsWith('1cs_v1:')) {
        const match = assetId.match(/^1cs_v1:([^:]+):/);
        if (match) {
          nativeChainTokens.push({
            ...token,
            blockchain: BLOCKCHAIN_ALIASES[match[1]] || match[1],
            defuseAssetId: assetId,
          });
        }
      } else {
        nativeChainTokens.push({ ...token, blockchain: apiBlockchain });
      }
    });

    const allTokens = [...deduplicateNearTokens(nearTokens), ...nativeChainTokens];

    // Apply static icons + symbol overrides (pricing loaded separately via /api/tokens/prices)
    applyIcons(allTokens);
    allTokens.forEach(removePricing);
    allTokens.forEach((token) => {
      const sym = token.symbol as string;
      if (SYMBOL_OVERRIDES[sym]) token.symbol = SYMBOL_OVERRIDES[sym];
    });

    return NextResponse.json(allTokens, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error: unknown) {
    logger.error('[TOKENS_ERROR]', error);
    return errorResponse('Failed to fetch tokens', 500);
  }
}
