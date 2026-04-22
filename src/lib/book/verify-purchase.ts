/**
 * On-chain verification for Book paid-content purchases.
 *
 * Scope: ANTI-FRAUD ONLY — we verify a submitted tx hash was actually
 * a transfer from the claimed buyer wallet to the space's payout wallet
 * on the claimed chain, with a non-zero amount. We do NOT (yet) verify
 * the USD value matches price_usd — token prices vary, the purchase
 * row doesn't record which token was paid in, and token-specific price
 * oracles are a larger integration. Owners still review amounts in the
 * dashboard; but verified purchases are pre-filtered so obvious fakes
 * are auto-rejected before hitting the owner's queue.
 *
 * Three outcomes:
 *   confirmed     — tx exists, is confirmed, and matches from/to
 *   rejected      — tx doesn't exist, failed, or from/to don't match
 *   inconclusive  — RPC unreachable, chain unsupported, or insufficient
 *                   data to decide. Caller keeps the purchase in its
 *                   current state for manual review.
 *
 * Multi-chain: EVM (viem) + NEAR (direct JSON-RPC). Sui and Solana
 * return inconclusive for now — owner reviews those manually until we
 * add per-chain verifiers.
 */

import { formatUnits, type Hash, type Hex } from "viem";
import { logger } from "@/lib/logger";
import { getPublicClient, getSupportedChains, type SupportedChain } from "@/lib/server/evm";

export type VerifyStatus = "confirmed" | "rejected" | "inconclusive";

export interface VerifyResult {
  status: VerifyStatus;
  /** Short human-readable reason. Surfaced in logs / API response. */
  reason: string;
  /** Native-unit amount the tx moved (for EVM: ETH-equivalent; NEAR: NEAR). Null if not determinable. */
  nativeAmount?: string | null;
  /** Token address if the tx was a token transfer (ERC20 for EVM, ft contract for NEAR). */
  tokenAddress?: string | null;
}

export interface VerifyInput {
  chain: string;
  txHash: string;
  fromWallet: string;
  toWallet: string;
}

export async function verifyPurchaseTx(input: VerifyInput): Promise<VerifyResult> {
  const chain = input.chain.toLowerCase();

  if (getSupportedChains().includes(chain)) {
    return verifyEvmTx(chain as SupportedChain, input);
  }
  if (chain === "near") {
    return verifyNearTx(input);
  }
  // Chains we don't verify yet — owner reviews manually.
  return {
    status: "inconclusive",
    reason: `on-chain verification not implemented for chain: ${chain}`,
  };
}

// ── EVM verifier ──────────────────────────────────────────────────────────

// Topic0 of ERC20 Transfer(address,address,uint256).
const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function verifyEvmTx(chain: SupportedChain, input: VerifyInput): Promise<VerifyResult> {
  try {
    const client = getPublicClient(chain);
    const receipt = await client.getTransactionReceipt({ hash: input.txHash as Hash });
    if (!receipt) {
      return { status: "rejected", reason: "tx not found on-chain" };
    }
    if (receipt.status !== "success") {
      return { status: "rejected", reason: "tx reverted or failed" };
    }

    const tx = await client.getTransaction({ hash: input.txHash as Hash });
    if (!tx) {
      return { status: "rejected", reason: "tx receipt found but tx body missing" };
    }

    const from = tx.from.toLowerCase();
    const buyer = input.fromWallet.toLowerCase();
    if (from !== buyer) {
      return {
        status: "rejected",
        reason: `tx.from (${from}) does not match buyer wallet (${buyer})`,
      };
    }

    // Native transfer path — tx.to == payout wallet, tx.value > 0.
    const payout = input.toWallet.toLowerCase();
    if (tx.to?.toLowerCase() === payout) {
      if (tx.value <= 0n) {
        return { status: "rejected", reason: "tx.value is zero" };
      }
      return {
        status: "confirmed",
        reason: "native transfer to payout wallet",
        nativeAmount: formatUnits(tx.value, 18),
        tokenAddress: null,
      };
    }

    // ERC20 transfer path — scan logs for Transfer(from=buyer, to=payout).
    for (const log of receipt.logs) {
      if (log.topics[0] !== ERC20_TRANSFER_TOPIC) continue;
      if (log.topics.length < 3) continue;
      // topics[1] and topics[2] are 32-byte padded addresses.
      const logFrom = topicToAddress(log.topics[1]!).toLowerCase();
      const logTo = topicToAddress(log.topics[2]!).toLowerCase();
      if (logFrom !== buyer) continue;
      if (logTo !== payout) continue;
      const amount = BigInt(log.data); // raw uint256 — we don't know decimals without extra RPC.
      if (amount <= 0n) continue;
      return {
        status: "confirmed",
        reason: "ERC20 transfer to payout wallet",
        // Decimals vary by token; caller logs raw for auditability.
        nativeAmount: amount.toString(),
        tokenAddress: log.address,
      };
    }

    return {
      status: "rejected",
      reason: "tx is valid but does not transfer to payout wallet",
    };
  } catch (err) {
    logger.warn("[verify-purchase] EVM verify failed", {
      chain,
      txHash: input.txHash,
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      status: "inconclusive",
      reason: "RPC error — manual review required",
    };
  }
}

function topicToAddress(topic: Hex): string {
  // Left-padded 32-byte topic → take the trailing 20 bytes.
  return "0x" + topic.slice(-40);
}

// ── NEAR verifier ─────────────────────────────────────────────────────────

interface NearRpcResponse {
  result?: {
    status?: { SuccessValue?: string } | string;
    transaction?: {
      signer_id?: string;
      receiver_id?: string;
      actions?: Array<
        | { Transfer?: { deposit?: string } }
        | { FunctionCall?: { method_name?: string; args?: string } }
      >;
    };
    transaction_outcome?: {
      outcome?: { status?: { SuccessValue?: string; Failure?: unknown } };
    };
  };
  error?: { message?: string };
}

async function verifyNearTx(input: VerifyInput): Promise<VerifyResult> {
  const rpcUrl = process.env.NEAR_RPC_URL || "https://rpc.fastnear.com";
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "verify-purchase",
        method: "tx",
        // NEAR's `tx` method takes [tx_hash, signer_id]; signer_id is
        // the account that signed — here it's the buyer.
        params: [input.txHash, input.fromWallet],
      }),
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      return {
        status: "inconclusive",
        reason: `NEAR RPC HTTP ${res.status}`,
      };
    }

    const body = (await res.json()) as NearRpcResponse;
    if (body.error || !body.result) {
      // NEAR returns "Transaction ... doesn't exist" as an error. Treat
      // as rejected — if RPC is truly down we'd have hit the HTTP branch.
      const msg = body.error?.message ?? "no result";
      return {
        status: "rejected",
        reason: `NEAR RPC: ${msg}`,
      };
    }

    const tx = body.result.transaction;
    const outcome = body.result.transaction_outcome?.outcome?.status;
    if (!tx) {
      return { status: "rejected", reason: "transaction body missing" };
    }

    // Outcome must be a SuccessValue, not Failure.
    if (outcome && typeof outcome === "object" && "Failure" in outcome) {
      return { status: "rejected", reason: "transaction failed on-chain" };
    }

    if (tx.signer_id !== input.fromWallet) {
      return {
        status: "rejected",
        reason: `signer_id (${tx.signer_id}) does not match buyer wallet (${input.fromWallet})`,
      };
    }

    // Case 1: native NEAR transfer — receiver_id is the payout wallet
    // and a Transfer action carries the deposit.
    if (tx.receiver_id === input.toWallet) {
      const transferAction = tx.actions?.find(
        (a) => typeof a === "object" && a !== null && "Transfer" in a,
      ) as { Transfer: { deposit: string } } | undefined;
      if (transferAction) {
        const yocto = BigInt(transferAction.Transfer.deposit);
        if (yocto <= 0n) {
          return { status: "rejected", reason: "Transfer deposit is zero" };
        }
        // 1 NEAR = 10^24 yoctoNEAR.
        return {
          status: "confirmed",
          reason: "native NEAR transfer to payout wallet",
          nativeAmount: formatUnits(yocto, 24),
          tokenAddress: null,
        };
      }
    }

    // Case 2: FT transfer — receiver_id is the FT contract, action is
    // FunctionCall method=ft_transfer with args.receiver_id == payout.
    const fnCall = tx.actions?.find(
      (a) => typeof a === "object" && a !== null && "FunctionCall" in a,
    ) as { FunctionCall: { method_name: string; args: string } } | undefined;

    if (fnCall?.FunctionCall.method_name === "ft_transfer") {
      // args is base64-encoded JSON.
      try {
        const argsJson = JSON.parse(
          Buffer.from(fnCall.FunctionCall.args, "base64").toString("utf8"),
        ) as { receiver_id?: string; amount?: string };
        if (argsJson.receiver_id === input.toWallet && argsJson.amount) {
          const amount = BigInt(argsJson.amount);
          if (amount <= 0n) {
            return { status: "rejected", reason: "ft_transfer amount is zero" };
          }
          return {
            status: "confirmed",
            reason: "NEP-141 ft_transfer to payout wallet",
            // Decimals vary per token — raw base-unit amount is recorded.
            nativeAmount: amount.toString(),
            tokenAddress: tx.receiver_id ?? null,
          };
        }
      } catch {
        // Fall through to rejection.
      }
    }

    return {
      status: "rejected",
      reason: "tx is valid but does not transfer to payout wallet",
    };
  } catch (err) {
    logger.warn("[verify-purchase] NEAR verify failed", {
      txHash: input.txHash,
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      status: "inconclusive",
      reason: "NEAR RPC error — manual review required",
    };
  }
}
