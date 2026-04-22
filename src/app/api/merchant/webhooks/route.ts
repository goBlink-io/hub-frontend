import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { getMerchantContext } from "@/lib/server/merchant-client";
import { logAudit } from "@/lib/merchant/audit";

export const dynamic = "force-dynamic";

const createLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 20 });

export async function POST(request: NextRequest) {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = createLimiter.check(ctx.user.id);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many webhook creations" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json();
  const { merchantId, url, events } = body;

  if (!merchantId || !url || !events?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const signingSecret = `whsec_${crypto.randomBytes(32).toString("hex")}`;

  const { data: webhook, error } = await ctx.merchantDb
    .from("webhook_endpoints")
    .insert({
      merchant_id: merchantId,
      url,
      events,
      signing_secret: signingSecret,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[merchant-webhooks]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  await logAudit({
    merchantId,
    actor: ctx.user.id,
    action: "webhook.created",
    resourceType: "webhook_endpoint",
    resourceId: webhook.id,
    metadata: { url, events },
  });

  return NextResponse.json({ id: webhook.id, signingSecret });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { webhookId, merchantId } = body;

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await ctx.merchantDb
    .from("webhook_endpoints")
    .delete()
    .eq("id", webhookId)
    .eq("merchant_id", merchantId);

  if (error) {
    console.error("[merchant-webhooks]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  await logAudit({
    merchantId,
    actor: ctx.user.id,
    action: "webhook.deleted",
    resourceType: "webhook_endpoint",
    resourceId: webhookId,
  });

  return NextResponse.json({ success: true });
}
