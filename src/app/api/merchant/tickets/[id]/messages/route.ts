import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(
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

  // Verify ticket ownership
  const { data: ticket } = await adminSupabase
    .from("support_tickets")
    .select("id")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .single();

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: messages } = await adminSupabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json(messages ?? []);
}

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

  const { data: ticket } = await adminSupabase
    .from("support_tickets")
    .select("id")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .single();

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { message } = body;

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const { data: msg, error } = await adminSupabase
    .from("ticket_messages")
    .insert({
      ticket_id: id,
      sender_type: "merchant",
      sender_id: user.id,
      message,
    })
    .select("id")
    .single();

  if (error) {
    console.error('[merchant-ticket-messages]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Update ticket status
  await adminSupabase
    .from("support_tickets")
    .update({
      status: "waiting_on_support",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json(msg);
}
