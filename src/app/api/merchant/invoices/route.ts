import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";

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

  const { data: invoices } = await adminSupabase
    .from("invoices")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(invoices ?? []);
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

  const { data: invoice, error } = await adminSupabase
    .from("invoices")
    .insert({
      merchant_id: merchant.id,
      ...body,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[merchant-invoices]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(invoice);
}
