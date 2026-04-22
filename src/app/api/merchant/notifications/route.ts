import { NextResponse } from "next/server";
import { getMerchantContext } from "@/lib/server/merchant-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ notifications: [] });

  // Schema table is `notifications` (see Merchant schema). An older
  // draft used `merchant_notifications`; kept the current column list.
  const { data: notifications } = await ctx.merchantDb
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ notifications: notifications ?? [] });
}
