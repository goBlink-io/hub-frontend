'use client';

import { isEvmChain, isNativeToken } from '@/lib/chains';

// All API calls go through our Next.js API routes (same origin)
const API_URL = '';

/**
 * Normalize balance API responses.
 * Some routes use successResponse wrapper: { success: true, data: { balance: "..." } }
 * Others return flat:                      { balance: "..." }
 * This handles both shapes safely.
 */
function extractBal(data: any): string {
  return data?.data?.balance ?? data?.balance ?? '0.00';
}

/**
 * Fetch NEAR account balance using backend API
 * @param accountId - NEAR account ID
 * @returns Balance in NEAR (not yoctoNEAR)
 */
export async function getNearBalance(accountId: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/balances/near/${accountId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.statusText}`);
    }
    
    const data = await response.json();
    return extractBal(data);
  } catch (error) {
    console.error('Failed to fetch NEAR balance:', error);
    return '0.00';
  }
}

/**
 * Fetch NEAR token balance (FT tokens) using backend API
 * @param accountId - NEAR account ID
 * @param contractAddress - Token contract address
 * @param decimals - Token decimals
 * @returns Token balance formatted
 */
export async function getNearTokenBalance(
  accountId: string,
  contractAddress: string,
  decimals: number
): Promise<string> {
  try {
    // Validate NEAR contract address format
    // Skip if it's an address from another blockchain:
    // - Ethereum: starts with 0x (42 chars total)
    // - Solana: base58 (typically 32-44 chars, capital letters indicate base58)
    // - Sui: contains ::
    if (
      contractAddress.startsWith('0x') || // Ethereum/EVM
      contractAddress.includes('::') || // Sui
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(contractAddress) // Likely Solana base58
    ) {
      // Non-NEAR contract address format — skip silently
      return '0.00';
    }
    
    const params = new URLSearchParams({
      contractAddress,
      decimals: decimals.toString(),
    });
    
    const response = await fetch(
      `${API_URL}/api/balances/near-token/${accountId}?${params}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch token balance: ${response.statusText}`);
    }
    
    const data = await response.json();
    return extractBal(data);
  } catch (error) {
    console.error('Failed to fetch NEAR token balance:', error);
    return '0.00';
  }
}

/**
 * Fetch SUI balance using backend API
 * @param address - Sui wallet address
 * @returns Balance in SUI (not MIST)
 */
export async function getSuiBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/balances/sui/${address}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch SUI balance: ${response.statusText}`);
    }
    
    const data = await response.json();
    return extractBal(data);
  } catch (error) {
    console.error('Failed to fetch SUI balance:', error);
    return '0.00';
  }
}

/**
 * Fetch Sui token balance (non-native tokens like USDC)
 * @param address - Sui wallet address
 * @param coinType - Full coin type address
 * @returns Token balance formatted
 */
export async function getSuiTokenBalance(
  address: string,
  coinType: string
): Promise<string> {
  try {
    const params = new URLSearchParams({ coinType });
    const response = await fetch(
      `${API_URL}/api/balances/sui-token/${address}?${params}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Sui token balance: ${response.statusText}`);
    }
    
    const data = await response.json();
    return extractBal(data);
  } catch (error) {
    console.error('Failed to fetch Sui token balance:', error);
    return '0.00';
  }
}

/**
 * Fetch native SOL balance using backend API
 * @param address - Solana wallet address
 * @returns Balance in SOL (not lamports)
 */
export async function getSolanaBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/balances/solana/${address}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch SOL balance: ${response.statusText}`);
    }
    
    const data = await response.json();
    return extractBal(data);
  } catch (error) {
    console.error('Failed to fetch SOL balance:', error);
    return '0.00';
  }
}

/**
 * Fetch SPL token balance for a Solana wallet
 * @param address - Solana wallet address
 * @param mintAddress - SPL token mint address
 */
export async function getSolanaTokenBalance(
  address: string,
  mintAddress: string
): Promise<string> {
  try {
    const response = await fetch(
      `${API_URL}/api/balances/solana-token/${address}?mint=${encodeURIComponent(mintAddress)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch SPL balance: ${response.statusText}`);
    }

    const data = await response.json();
    return extractBal(data);
  } catch (error) {
    console.error('Failed to fetch SPL token balance:', error);
    return '0.00';
  }
}

/**
 * Fetch native EVM balance (ETH, BNB, BERA, MON, etc.)
 * @param chain - Chain name (ethereum, base, arbitrum, bsc, polygon, optimism, berachain, monad)
 * @param address - EVM wallet address
 */
export async function getEvmBalance(
  chain: string,
  address: string
): Promise<string> {
  try {
    const response = await fetch(
      `${API_URL}/api/balances/evm/${chain}/${address}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch EVM balance: ${response.statusText}`);
    }
    
    const data = await response.json();
    return extractBal(data);
  } catch (error) {
    console.error(`Failed to fetch ${chain} balance:`, error);
    return '0.00';
  }
}

/**
 * Fetch ERC-20 token balance
 * @param chain - Chain name
 * @param address - Wallet address
 * @param tokenAddress - Token contract address
 * @param decimals - Token decimals (optional)
 */
export async function getEvmTokenBalance(
  chain: string,
  address: string,
  tokenAddress: string,
  decimals?: number
): Promise<string> {
  try {
    const params = new URLSearchParams({ tokenAddress });
    if (decimals !== undefined) params.append('decimals', decimals.toString());
    
    const response = await fetch(
      `${API_URL}/api/balances/evm-token/${chain}/${address}?${params}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch EVM token balance: ${response.statusText}`);
    }
    
    const data = await response.json();
    return extractBal(data);
  } catch (error) {
    console.error(`Failed to fetch ${chain} token balance:`, error);
    return '0.00';
  }
}

/**
 * Fetch balance for any token based on its configuration
 * @param address - Wallet address
 * @param token - Token configuration
 * @returns Balance as string
 */
export async function getTokenBalance(
  address: string,
  token: {
    blockchain?: string;
    contractAddress?: string;
    address?: string;
    assetId?: string;
    decimals: number;
    symbol: string;
  }
): Promise<string> {
  const blockchain = (token.blockchain || 'near').toLowerCase();
  
  // EVM chains
  if (isEvmChain(blockchain)) {
    // Check if it's a native token (ETH, BNB, BERA, MON, MATIC)
    if (isNativeToken(token.symbol)) {
      return getEvmBalance(blockchain, address);
    }
    
    // ERC-20 token
    const tokenAddr = token.contractAddress || token.address;
    if (tokenAddr) {
      return getEvmTokenBalance(
        blockchain,
        address,
        tokenAddr,
        token.decimals
      );
    }
    
    return '0.00';
  }
  
  if (blockchain === 'near') {
    // Native NEAR token
    if (token.symbol === 'NEAR') {
      return getNearBalance(address);
    }

    // NEAR FT token: derive the NEAR contract from assetId (nep141:<contract>)
    // The 1Click API stores the *source-chain* address in contractAddress for OMFT tokens
    // (e.g. contractAddress='usdcx' for aleo-usdcx.omft.near) — that's wrong for NEAR RPC.
    // The correct NEAR contract is always the part after 'nep141:' in assetId.
    let nearContract: string | undefined;
    if (token.assetId?.startsWith('nep141:')) {
      nearContract = token.assetId.replace('nep141:', '');
    } else {
      nearContract = token.contractAddress;
    }

    if (nearContract) {
      return getNearTokenBalance(address, nearContract, token.decimals);
    }
  }
  
  if (blockchain === 'sui') {
    // Native SUI token
    if (token.symbol === 'SUI') {
      return getSuiBalance(address);
    }
    
    // Other Sui tokens (like USDC) - use the full coin type address
    if (token.address) {
      return getSuiTokenBalance(address, token.address);
    }
    
    return '0.00';
  }
  
  if (blockchain === 'solana') {
    // Native SOL token
    if (token.symbol === 'SOL') {
      return getSolanaBalance(address);
    }

    // SPL token — contractAddress is the mint address
    const mintAddress = token.contractAddress || token.address;
    if (mintAddress) {
      return getSolanaTokenBalance(address, mintAddress);
    }

    return '0.00';
  }
  
  // Unsupported blockchain
  return '0.00';
}
