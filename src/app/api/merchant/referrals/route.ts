import { NextResponse } from "next/server";
import { getMerchantContext } from "@/lib/server/merchant-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id, referral_code")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Schema table is `merchant_referrals` with `referrer_id` / `referred_id`.
  const { data: referrals } = await ctx.merchantDb
    .from("merchant_referrals")
    .select("id, referred_id, status, created_at, reward_applied, activated_at")
    .eq("referrer_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    referralCode: merchant.referral_code,
    referrals: referrals ?? [],
    // Reward_applied is boolean in the current schema; earnings math
    // isn't modeled yet and should live in a payout ledger later.
    totalEarnings: 0,
  });
}
