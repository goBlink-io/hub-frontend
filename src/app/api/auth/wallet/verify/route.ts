import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { verifyMessageNonce } from "@/lib/server/wallet-auth/nonce";
import {
  verifyWalletSignature,
  WalletVerifyError,
} from "@/lib/server/wallet-auth/verify";
import {
  signInWithWallet,
  WalletSessionError,
} from "@/lib/server/wallet-auth/session";
import { ALL_CHAINS, type ChainType } from "@/lib/server/wallet-auth/types";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verify is more expensive (signature recovery + DB writes) — tighter cap.
const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = limiter.check(ip);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many verification attempts" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { chain, address, message, signature, walletName } = body as {
    chain?: string;
    address?: string;
    message?: string;
    signature?: string;
    walletName?: string;
  };

  if (!chain || !ALL_CHAINS.includes(chain as ChainType)) {
    return NextResponse.json({ error: "Invalid chain" }, { status: 400 });
  }
  if (!address || typeof address !== "string" || address.length > 200) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.length > 2000) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }
  if (!signature || typeof signature !== "string" || signature.length > 500) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Step 1: confirm the nonce embedded in the message was issued by us and
  // matches the claimed (chain, address). This guards against signature
  // replay (nonce expiry) and against signing for the wrong identity.
  try {
    verifyMessageNonce({
      message,
      expectedChain: chain,
      expectedAddress: address,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Nonce check failed" },
      { status: 401 },
    );
  }

  // Step 2: verify the wallet's cryptographic signature on the message.
  try {
    const ok = await verifyWalletSignature({
      chain: chain as ChainType,
      address,
      message,
      signature,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 401 },
      );
    }
  } catch (err) {
    if (err instanceof WalletVerifyError) {
      const status = err.code === "chain_not_supported" ? 501 : 400;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    logger.error("[auth/wallet/verify] signature verify error", err);
    return NextResponse.json(
      { error: "Verification error" },
      { status: 500 },
    );
  }

  // Step 3: lookup-or-create the user, mint the Supabase session, set cookie.
  try {
    const result = await signInWithWallet({
      chain: chain as ChainType,
      address,
      walletName: typeof walletName === "string" ? walletName : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WalletSessionError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    logger.error("[auth/wallet/verify] session mint error", err);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 },
    );
  }
}
