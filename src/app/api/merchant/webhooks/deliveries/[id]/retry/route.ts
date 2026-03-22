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

  // Get delivery with ownership verification
  const { data: delivery } = await adminSupabase
    .from("webhook_deliveries")
    .select("*, webhook_endpoints!inner(id, url, signing_secret, merchant_id, merchants!inner(user_id))")
    .eq("id", id)
    .single();

  if (!delivery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const endpoint = delivery.webhook_endpoints as unknown as {
    id: string;
    url: string;
    signing_secret: string;
    merchant_id: string;
    merchants: { user_id: string };
  };

  if (endpoint.merchants.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Retry the delivery
  const body = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", endpoint.signing_secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  let delivered = false;
  let responseStatus: number | null = null;
  let responseBody: string | null = null;

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GoBlink-Signature": `t=${timestamp},v1=${signature}`,
        "X-GoBlink-Event": delivery.event,
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

  // Log retry as new delivery
  await adminSupabase.from("webhook_deliveries").insert({
    webhook_endpoint_id: endpoint.id,
    event: delivery.event,
    payload: delivery.payload,
    response_status: responseStatus,
    response_body: responseBody?.slice(0, 2000) ?? null,
    attempt: (delivery.attempt || 1) + 1,
    delivered_at: delivered ? new Date().toISOString() : null,
  });

  return NextResponse.json({ delivered, responseStatus });
}
