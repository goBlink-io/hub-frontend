import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { getMerchantContext } from "@/lib/server/merchant-client";
import { logAudit } from "@/lib/merchant/audit";

export const dynamic = "force-dynamic";

const createLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 100 });

export async function GET() {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: links } = await ctx.merchantDb
    .from("payment_links")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(links ?? []);
}

export async function POST(request: NextRequest) {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = createLimiter.check(ctx.user.id);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many payment link creations" },
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
  const { amount, currency, title, description, reusable } = body;

  if (!amount || !currency) {
    return NextResponse.json(
      { error: "Amount and currency are required" },
      { status: 400 },
    );
  }

  const { data: link, error } = await ctx.merchantDb
    .from("payment_links")
    .insert({
      merchant_id: merchant.id,
      amount,
      currency: currency || "USD",
      title: title || null,
      description: description || null,
      reusable: reusable ?? false,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[merchant-payment-links]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  await logAudit({
    merchantId: merchant.id,
    actor: ctx.user.id,
    action: "payment_link.created",
    resourceType: "payment_link",
    resourceId: link.id,
    metadata: { amount, currency },
  });

  return NextResponse.json(link);
}
