import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { issueNonce } from "@/lib/server/wallet-auth/nonce";
import { ALL_CHAINS, type ChainType } from "@/lib/server/wallet-auth/types";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP cap: nonces are cheap but should not be sprayed.
const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });

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
      { error: "Too many sign-in requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { chain, address } = body as { chain?: string; address?: string };

  if (!chain || !ALL_CHAINS.includes(chain as ChainType)) {
    return NextResponse.json(
      { error: `chain must be one of: ${ALL_CHAINS.join(", ")}` },
      { status: 400 },
    );
  }
  if (!address || typeof address !== "string" || address.length > 200) {
    return NextResponse.json(
      { error: "address is required" },
      { status: 400 },
    );
  }

  try {
    const domain = request.nextUrl.host;
    const issued = issueNonce({
      chain: chain as ChainType,
      address,
      domain,
    });
    return NextResponse.json(issued);
  } catch (err) {
    logger.error("[auth/wallet/nonce] issue failed", err);
    return NextResponse.json(
      { error: "Failed to issue nonce" },
      { status: 500 },
    );
  }
}
