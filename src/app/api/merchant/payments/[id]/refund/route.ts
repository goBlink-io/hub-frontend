import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { getMerchantContext } from "@/lib/server/merchant-client";
import { logAudit } from "@/lib/merchant/audit";

export const dynamic = "force-dynamic";

const refundLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 30 });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = refundLimiter.check(ctx.user.id);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many refund attempts. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: payment } = await ctx.merchantDb
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status !== "confirmed") {
    return NextResponse.json(
      { error: "Only confirmed payments can be refunded" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const amount = body.amount || payment.amount;
  const reason = body.reason || "Merchant initiated refund";

  const { data: refund, error } = await ctx.merchantDb
    .from("refunds")
    .insert({
      payment_id: id,
      merchant_id: merchant.id,
      amount,
      currency: payment.currency,
      reason,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[merchant-refund]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const isPartial = Number(amount) < Number(payment.amount);
  await ctx.merchantDb
    .from("payments")
    .update({
      status: isPartial ? "partially_refunded" : "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logAudit({
    merchantId: merchant.id,
    actor: ctx.user.id,
    action: "refund.created",
    resourceType: "refund",
    resourceId: refund.id,
    metadata: { paymentId: id, amount, reason },
  });

  return NextResponse.json({ id: refund.id, status: "pending" });
}
