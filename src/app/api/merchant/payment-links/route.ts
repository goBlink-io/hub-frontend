import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";
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

  const { data: links } = await adminSupabase
    .from("payment_links")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(links ?? []);
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
  const { amount, currency, title, description, reusable } = body;

  if (!amount || !currency) {
    return NextResponse.json({ error: "Amount and currency are required" }, { status: 400 });
  }

  const { data: link, error } = await adminSupabase
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
    console.error("[merchant-payment-links]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  await logAudit({
    merchantId: merchant.id,
    actor: user.id,
    action: "payment_link.created",
    resourceType: "payment_link",
    resourceId: link.id,
    metadata: { amount, currency },
  });

  return NextResponse.json(link);
}
