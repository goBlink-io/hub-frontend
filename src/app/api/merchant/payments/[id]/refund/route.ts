import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";
import { logAudit } from "@/lib/merchant/audit";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .single();

  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  if (payment.status !== "confirmed") {
    return NextResponse.json(
      { error: "Only confirmed payments can be refunded" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const amount = body.amount || payment.amount;
  const reason = body.reason || "Merchant initiated refund";

  // Create refund record
  const { data: refund, error } = await adminSupabase
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
    console.error('[merchant-refund]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Update payment status
  const isPartial = Number(amount) < Number(payment.amount);
  await adminSupabase
    .from("payments")
    .update({
      status: isPartial ? "partially_refunded" : "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logAudit({
    merchantId: merchant.id,
    actor: user.id,
    action: "refund.created",
    resourceType: "refund",
    resourceId: refund.id,
    metadata: { paymentId: id, amount, reason },
  });

  return NextResponse.json({ id: refund.id, status: "pending" });
}
