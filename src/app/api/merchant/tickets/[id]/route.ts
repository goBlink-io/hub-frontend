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
    .select("*")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(ticket);
}
