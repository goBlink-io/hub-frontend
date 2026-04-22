import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { getMerchantContext } from "@/lib/server/merchant-client";

export const dynamic = "force-dynamic";

const createLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 20 });

export async function GET() {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json([], { status: 200 });

  // Schema table is `tickets` (see Merchant schema).
  const { data: tickets } = await ctx.merchantDb
    .from("tickets")
    .select("id, subject, status, priority, created_at, updated_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(tickets ?? []);
}

export async function POST(request: NextRequest) {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = createLimiter.check(ctx.user.id);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many ticket creations" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { subject, message, priority } = body;

  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and message are required" },
      { status: 400 },
    );
  }

  const { data: ticket, error } = await ctx.merchantDb
    .from("tickets")
    .insert({
      merchant_id: merchant.id,
      subject,
      description: message,
      status: "open",
      priority: priority || "medium",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[merchant-tickets]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  await ctx.merchantDb.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_type: "merchant",
    sender_id: ctx.user.id,
    message,
  });

  return NextResponse.json(ticket);
}
