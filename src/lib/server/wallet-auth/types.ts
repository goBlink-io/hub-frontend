/**
 * Shared types for wallet auth. Mirrors @goblink/connect's ChainType
 * exactly (kept duplicated to avoid pulling client-side blinkconnect into
 * server bundles).
 */

export type ChainType =
  | "evm"
  | "solana"
  | "sui"
  | "near"
  | "bitcoin"
  | "aptos"
  | "starknet"
  | "ton"
  | "tron";

export const ALL_CHAINS: ReadonlyArray<ChainType> = [
  "evm",
  "solana",
  "sui",
  "near",
  "bitcoin",
  "aptos",
  "starknet",
  "ton",
  "tron",
] as const;

export interface WalletNonceResponse {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface WalletVerifyRequest {
  chain: ChainType;
  address: string;
  message: string;
  signature: string;
  /** Optional metadata captured from the wallet UI (e.g. wallet name). */
  walletName?: string;
}

export interface WalletVerifyResponse {
  userId: string;
  walletId: string;
  chain: ChainType;
  address: string;
  isNewUser: boolean;
}
