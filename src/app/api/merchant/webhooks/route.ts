import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";
import { logAudit } from "@/lib/merchant/audit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { merchantId, url, events } = body;

  if (!merchantId || !url || !events?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify ownership
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Generate signing secret
  const signingSecret = `whsec_${crypto.randomBytes(32).toString("hex")}`;

  const { data: webhook, error } = await adminSupabase
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    merchantId,
    actor: user.id,
    action: "webhook.created",
    resourceType: "webhook_endpoint",
    resourceId: webhook.id,
    metadata: { url, events },
  });

  return NextResponse.json({ id: webhook.id, signingSecret });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { webhookId, merchantId } = body;

  // Verify ownership
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await adminSupabase
    .from("webhook_endpoints")
    .delete()
    .eq("id", webhookId)
    .eq("merchant_id", merchantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    merchantId,
    actor: user.id,
    action: "webhook.deleted",
    resourceType: "webhook_endpoint",
    resourceId: webhookId,
  });

  return NextResponse.json({ success: true });
}
