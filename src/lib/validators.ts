/**
 * Validation utilities for addresses, amounts, and other input data.
 */

/**
 * Validate EVM address (0x followed by 40 hex characters)
 */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate Solana address (base58 format, typically 32-44 characters)
 */
export function isValidSolanaAddress(address: string): boolean {
  // Base58 charset: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  // Typical length: 32-44 characters
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validate NEAR account ID
 * Valid formats:
 * - Named accounts: "alice.near", "sub.alice.near" (2-64 chars, lowercase, alphanumeric, dots, dashes, underscores)
 * - Implicit accounts: 64 hex characters
 */
export function isValidNearAccount(accountId: string): boolean {
  if (accountId.length < 2 || accountId.length > 64) {
    return false;
  }
  
  // Implicit account (hex)
  if (/^[a-f0-9]{64}$/.test(accountId)) {
    return true;
  }
  
  // Named account
  // Must end with .near or .testnet, or be a top-level account
  // Can contain lowercase letters, digits, dots, dashes, underscores
  return /^([a-z0-9_-]+\.)*[a-z0-9_-]+$/.test(accountId);
}

/**
 * Validate Sui address (0x followed by 64 hex characters)
 */
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

/**
 * Validate transaction amount
 * - Must be a valid BigInt
 * - Must be positive
 * - Must not exceed reasonable maximum
 */
export function isValidAmount(amount: string | number, decimals: number = 18): {
  valid: boolean;
  error?: string;
  value?: bigint;
} {
  try {
    const amountBigInt = BigInt(amount);
    
    if (amountBigInt <= 0n) {
      return { valid: false, error: 'Amount must be positive' };
    }
    
    // Reasonable upper bound check (1 billion tokens with given decimals)
    const maxAmount = 10n ** 9n * (10n ** BigInt(decimals));
    if (amountBigInt > maxAmount) {
      return { valid: false, error: 'Amount exceeds reasonable maximum (1B tokens)' };
    }
    
    return { valid: true, value: amountBigInt };
  } catch (error) {
    return { valid: false, error: 'Invalid amount format (must be a valid integer)' };
  }
}

/**
 * Validate asset ID format
 * Expected formats: "nep141:token.near", "sui:0x123...", "solana:0x123...", "evm:ethereum:0x123..."
 */
export function isValidAssetId(assetId: string): boolean {
  if (!assetId || typeof assetId !== 'string') {
    return false;
  }
  
  // Basic format check
  if (assetId.length < 5 || assetId.length > 256) {
    return false;
  }
  
  // Must start with a known chain prefix
  const validPrefixes = ['nep141:', 'nep245:', '1cs_v1:', 'sui:', 'solana:', 'evm:', 'near:', 'tron:', 'ton:', 'bitcoin:', 'starknet:', 'aptos:'];
  const hasValidPrefix = validPrefixes.some(prefix => assetId.startsWith(prefix));
  
  if (!hasValidPrefix) {
    return false;
  }
  
  // Allow alphanumeric, dots, colons, dashes, underscores, @ symbol
  return /^[a-zA-Z0-9:@.\-_]+$/.test(assetId);
}

/**
 * Validate slippage tolerance (in basis points)
 * Valid range: 0-10000 bps (0-100%)
 */
export function isValidSlippage(slippage: number): boolean {
  return typeof slippage === 'number' && slippage >= 0 && slippage <= 10000;
}

/**
 * Validate deadline timestamp
 * - Must be in the future
 * - Must not be more than 24 hours in the future
 */
export function isValidDeadline(deadline: string | Date): {
  valid: boolean;
  error?: string;
  date?: Date;
} {
  try {
    const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
    
    if (isNaN(deadlineDate.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }
    
    const now = Date.now();
    const deadlineTime = deadlineDate.getTime();
    
    if (deadlineTime < now) {
      return { valid: false, error: 'Deadline cannot be in the past' };
    }
    
    const maxFuture = now + 24 * 60 * 60 * 1000; // 24 hours
    if (deadlineTime > maxFuture) {
      return { valid: false, error: 'Deadline cannot be more than 24 hours in the future' };
    }
    
    return { valid: true, date: deadlineDate };
  } catch (error) {
    return { valid: false, error: 'Invalid deadline' };
  }
}

/**
 * Validate transaction hash format (basic check)
 */
export function isValidTxHash(txHash: string): boolean {
  if (!txHash || typeof txHash !== 'string') {
    return false;
  }
  
  // Most tx hashes are 32-128 characters, hex or base58
  if (txHash.length < 32 || txHash.length > 128) {
    return false;
  }
  
  // Allow hex (with or without 0x) or base58
  return /^(0x)?[a-fA-F0-9]{64,128}$/.test(txHash) || /^[1-9A-HJ-NP-Za-km-z]{32,128}$/.test(txHash);
}
