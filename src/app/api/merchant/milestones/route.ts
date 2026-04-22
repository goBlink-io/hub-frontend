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

  if (!merchant) return NextResponse.json({ milestones: [] });

  const { data: milestones } = await ctx.merchantDb
    .from("merchant_milestones")
    .select("milestone_key, achieved_at")
    .eq("merchant_id", merchant.id)
    .order("achieved_at", { ascending: false });

  return NextResponse.json({ milestones: milestones ?? [] });
}
