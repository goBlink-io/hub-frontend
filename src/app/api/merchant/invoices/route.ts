import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { getMerchantContext } from "@/lib/server/merchant-client";

export const dynamic = "force-dynamic";

const createLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 100 });

export async function GET() {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: invoices } = await ctx.merchantDb
    .from("invoices")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(invoices ?? []);
}

export async function POST(request: NextRequest) {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = createLimiter.check(ctx.user.id);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many invoice creations" },
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

  const { data: invoice, error } = await ctx.merchantDb
    .from("invoices")
    .insert({
      merchant_id: merchant.id,
      ...body,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[merchant-invoices]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(invoice);
}
