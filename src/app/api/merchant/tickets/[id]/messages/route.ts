import { NextRequest, NextResponse } from "next/server";
import { getMerchantContext } from "@/lib/server/merchant-client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: ticket } = await ctx.merchantDb
    .from("tickets")
    .select("id")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: messages } = await ctx.merchantDb
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json(messages ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: ticket } = await ctx.merchantDb
    .from("tickets")
    .select("id")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { message } = body;

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const { data: msg, error } = await ctx.merchantDb
    .from("ticket_messages")
    .insert({
      ticket_id: id,
      sender_type: "merchant",
      sender_id: ctx.user.id,
      message,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[merchant-ticket-messages]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  await ctx.merchantDb
    .from("tickets")
    .update({
      // Column `status` only allows the values defined in schema check
      // constraint; stick to known safe states.
      status: "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json(msg);
}
