import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getMerchantContext } from "@/lib/server/merchant-client";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: webhook } = await ctx.merchantDb
    .from("webhook_endpoints")
    .select("*, merchants!inner(user_id)")
    .eq("id", id)
    .maybeSingle();

  if (!webhook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const merchant = webhook.merchants as unknown as { user_id: string };
  if (merchant.user_id !== ctx.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Send test event
  const testPayload = {
    event: "payment.confirmed",
    data: {
      id: "test_" + crypto.randomUUID(),
      amount: "25.00",
      currency: "USD",
      status: "confirmed",
      is_test: true,
      created_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  };

  const body = JSON.stringify(testPayload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", webhook.signing_secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  let delivered = false;
  let responseStatus: number | null = null;
  let responseBody: string | null = null;

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GoBlink-Signature": `t=${timestamp},v1=${signature}`,
        "X-GoBlink-Event": "payment.confirmed",
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    responseStatus = res.status;
    responseBody = await res.text().catch(() => null);
    delivered = res.ok;
  } catch (err) {
    responseBody = err instanceof Error ? err.message : "Connection failed";
  }

  // Log the delivery
  await ctx.merchantDb.from("webhook_deliveries").insert({
    webhook_endpoint_id: id,
    event: "payment.confirmed",
    payload: testPayload,
    response_status: responseStatus,
    response_body: responseBody?.slice(0, 2000) ?? null,
    attempt: 1,
    delivered_at: delivered ? new Date().toISOString() : null,
  });

  return NextResponse.json({
    delivered,
    responseStatus,
    responseBody: responseBody?.slice(0, 500) ?? null,
  });
}
