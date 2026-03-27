import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";
import { generateApiKey } from "@/lib/merchant/api-auth";
import { logAudit } from "@/lib/merchant/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: keys } = await adminSupabase
    .from("api_keys")
    .select("id, key_prefix, label, is_test, created_at, last_used_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(keys ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const isTest = body.is_test ?? false;
  const label = body.label || "Default";

  try {
    const result = await generateApiKey(merchant.id, isTest, label);

    await logAudit({
      merchantId: merchant.id,
      actor: user.id,
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: result.keyId,
      metadata: { isTest, label },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[merchant-api-keys-post]', err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { keyId } = body;

  const { error } = await adminSupabase
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("merchant_id", merchant.id);

  if (error) {
    console.error('[merchant-api-keys-delete]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  await logAudit({
    merchantId: merchant.id,
    actor: user.id,
    action: "api_key.deleted",
    resourceType: "api_key",
    resourceId: keyId,
  });

  return NextResponse.json({ success: true });
}
