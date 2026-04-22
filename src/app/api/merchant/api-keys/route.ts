import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { getMerchantContext } from "@/lib/server/merchant-client";
import { generateApiKey } from "@/lib/merchant/api-auth";
import { logAudit } from "@/lib/merchant/audit";

export const dynamic = "force-dynamic";

// API keys are security-sensitive — keep creation low-frequency.
const createLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 10 });

export async function GET() {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: keys } = await ctx.merchantDb
    .from("api_keys")
    .select("id, key_prefix, label, is_test, created_at, last_used_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(keys ?? []);
}

export async function POST(request: NextRequest) {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = createLimiter.check(ctx.user.id);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many API key creations" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const isTest = body.is_test ?? false;
  const label = body.label || "Default";

  try {
    const result = await generateApiKey(merchant.id, isTest, label);

    await logAudit({
      merchantId: merchant.id,
      actor: ctx.user.id,
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: result.keyId,
      metadata: { isTest, label },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[merchant-api-keys-post]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { keyId } = body;

  const { error } = await ctx.merchantDb
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("merchant_id", merchant.id);

  if (error) {
    console.error("[merchant-api-keys-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  await logAudit({
    merchantId: merchant.id,
    actor: ctx.user.id,
    action: "api_key.deleted",
    resourceType: "api_key",
    resourceId: keyId,
  });

  return NextResponse.json({ success: true });
}
