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

  if (!merchant) return NextResponse.json([], { status: 200 });

  const { data: tickets } = await adminSupabase
    .from("support_tickets")
    .select("id, subject, status, priority, created_at, updated_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(tickets ?? []);
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
  const { subject, message, priority } = body;

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const { data: ticket, error } = await adminSupabase
    .from("support_tickets")
    .insert({
      merchant_id: merchant.id,
      subject,
      status: "open",
      priority: priority || "normal",
    })
    .select("id")
    .single();

  if (error) {
    console.error('[merchant-tickets]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Create first message
  await adminSupabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_type: "merchant",
    sender_id: user.id,
    message,
  });

  return NextResponse.json(ticket);
}
