import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get webhook with ownership check
  const { data: webhook } = await adminSupabase
    .from("webhook_endpoints")
    .select("*, merchants!inner(user_id)")
    .eq("id", id)
    .single();

  if (!webhook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const merchant = webhook.merchants as unknown as { user_id: string };
  if (merchant.user_id !== user.id) {
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
  await adminSupabase.from("webhook_deliveries").insert({
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
