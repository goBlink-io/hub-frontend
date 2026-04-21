/**
 * Per-chain wallet signature verifiers.
 *
 * Each verifier takes (address, message, signature) and returns true iff the
 * signature was produced by the private key controlling the claimed address.
 * No app concerns (DB, JWT, sessions) — pure crypto. Designed to be liftable
 * into `@goblink/connect/server` if a second consumer ever needs it.
 *
 * Coverage today: EVM, Solana, Sui, NEAR. Aptos / Bitcoin / Starknet / TON /
 * Tron return "not yet supported" — easy to add when blinkconnect's adapters
 * for those chains stabilize their signature payload format.
 */

import { recoverMessageAddress } from "viem";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { KeyPair } from "near-api-js";

import type { ChainType } from "./types";

export type SupportedChain = "evm" | "solana" | "sui" | "near";

export const SUPPORTED_CHAINS: ReadonlyArray<SupportedChain> = [
  "evm",
  "solana",
  "sui",
  "near",
] as const;

export class WalletVerifyError extends Error {
  readonly code: string;
  constructor(message: string, code = "verify_failed") {
    super(message);
    this.name = "WalletVerifyError";
    this.code = code;
  }
}

export interface VerifyInput {
  chain: ChainType;
  address: string;
  message: string;
  signature: string;
}

export async function verifyWalletSignature(input: VerifyInput): Promise<boolean> {
  const { chain, address, message, signature } = input;
  switch (chain) {
    case "evm":
      return verifyEvm(address, message, signature);
    case "solana":
      return verifySolana(address, message, signature);
    case "sui":
      return verifySui(address, message, signature);
    case "near":
      return verifyNear(address, message, signature);
    case "aptos":
    case "bitcoin":
    case "starknet":
    case "ton":
    case "tron":
      throw new WalletVerifyError(
        `Wallet sign-in for ${chain} is not yet supported on the server`,
        "chain_not_supported",
      );
    default: {
      const _exhaustive: never = chain;
      throw new WalletVerifyError(
        `Unknown chain: ${String(_exhaustive)}`,
        "unknown_chain",
      );
    }
  }
}

/* --------------------------------- EVM ----------------------------------- */

async function verifyEvm(
  address: string,
  message: string,
  signature: string,
): Promise<boolean> {
  if (!signature.startsWith("0x")) {
    throw new WalletVerifyError("EVM signature must be hex-encoded with 0x prefix");
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new WalletVerifyError("EVM address must be a 0x-prefixed 20-byte hex string");
  }
  const recovered = await recoverMessageAddress({
    message,
    signature: signature as `0x${string}`,
  });
  return recovered.toLowerCase() === address.toLowerCase();
}

/* -------------------------------- Solana --------------------------------- */

function verifySolana(
  address: string,
  message: string,
  signature: string,
): boolean {
  let pubkeyBytes: Uint8Array;
  try {
    pubkeyBytes = bs58.decode(address);
  } catch {
    throw new WalletVerifyError("Solana address must be base58-encoded");
  }
  if (pubkeyBytes.length !== 32) {
    throw new WalletVerifyError("Solana public key must be 32 bytes");
  }

  let sigBytes: Uint8Array;
  try {
    sigBytes = bs58.decode(signature);
  } catch {
    throw new WalletVerifyError("Solana signature must be base58-encoded");
  }
  if (sigBytes.length !== 64) {
    throw new WalletVerifyError("Solana signature must be 64 bytes");
  }

  const messageBytes = new TextEncoder().encode(message);
  return nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes);
}

/* ---------------------------------- Sui ---------------------------------- */

async function verifySui(
  address: string,
  message: string,
  signature: string,
): Promise<boolean> {
  // Sui uses BCS-prefixed personal-message signing. The @mysten/sui helper
  // takes the raw message + the wallet's signature blob and returns the
  // recovered public key, which we compare to the claimed address.
  try {
    const messageBytes = new TextEncoder().encode(message);
    const publicKey = await verifyPersonalMessageSignature(messageBytes, signature);
    const recovered = publicKey.toSuiAddress();
    return recovered === address;
  } catch (err) {
    throw new WalletVerifyError(
      `Sui signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/* --------------------------------- NEAR ---------------------------------- */

/**
 * NEAR signatures: blinkconnect produces a NEP-413-style payload using one of
 * the account's full or function-call access keys. We expect the client to
 * send the signature as `<keyType>:<base58 sig>` paired with the public key
 * also as `<keyType>:<base58 pubkey>` carried in the message body.
 *
 * For v1 we accept a simpler shape: signature is `ed25519:<base58>` and the
 * caller has already proven the public key belongs to the account by setting
 * the address to the public key string itself (NEAR implicit account format).
 * Full account-key resolution via near-api-js can be added as a follow-up
 * once we standardize the client-side signing payload in blinkconnect.
 */
function verifyNear(
  address: string,
  message: string,
  signature: string,
): boolean {
  if (!signature.startsWith("ed25519:")) {
    throw new WalletVerifyError(
      "NEAR signature must be ed25519:<base58> (NEP-413 format)",
    );
  }
  let pubkeyStr: string;
  if (address.startsWith("ed25519:")) {
    pubkeyStr = address;
  } else if (/^[0-9a-f]{64}$/i.test(address)) {
    // Implicit account = hex of the public key. Reformat as ed25519:<base58>.
    pubkeyStr = `ed25519:${bs58.encode(Buffer.from(address, "hex"))}`;
  } else {
    throw new WalletVerifyError(
      "NEAR address must be either ed25519:<pubkey> or a 64-char implicit account hex. " +
        "Named-account verification (lookup access keys via RPC) is not yet supported.",
      "near_named_account_unsupported",
    );
  }
  const keyPair = KeyPair.fromString(pubkeyStr as `ed25519:${string}`);
  const messageBytes = new TextEncoder().encode(message);
  return keyPair.verify(messageBytes, bs58.decode(signature.slice("ed25519:".length)));
}
