import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, referral_code")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: referrals } = await adminSupabase
    .from("referrals")
    .select("id, referred_merchant_id, status, created_at, reward_amount")
    .eq("referrer_merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    referralCode: merchant.referral_code,
    referrals: referrals ?? [],
    totalEarnings: referrals?.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0) ?? 0,
  });
}
