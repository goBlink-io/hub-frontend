import { NextRequest, NextResponse } from "next/server";
import { getMerchantContext } from "@/lib/server/merchant-client";
import { getExchangeRate } from "@/lib/merchant/forex";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("*")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isTest = request.nextUrl.searchParams.get("is_test") === "true";

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: recentPayments } = await ctx.merchantDb
    .from("payments")
    .select("id, external_order_id, amount, currency, status, created_at, is_test")
    .eq("merchant_id", merchant.id)
    .eq("is_test", isTest)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: todayPayments } = await ctx.merchantDb
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", isTest)
    .gte("confirmed_at", todayStart.toISOString());

  const { count: pendingCount } = await ctx.merchantDb
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .eq("is_test", isTest)
    .in("status", ["pending", "processing"]);

  const { data: allConfirmed } = await ctx.merchantDb
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", isTest);

  const todayRevenue = todayPayments?.reduce(
    (sum, p) => sum + (Number(p.net_amount) || 0), 0,
  ) ?? 0;

  const totalBalance = allConfirmed?.reduce(
    (sum, p) => sum + (Number(p.net_amount) || 0), 0,
  ) ?? 0;

  const displayCurrency = merchant.display_currency || "USD";
  const exchangeRate = await getExchangeRate(displayCurrency);

  return NextResponse.json({
    totalBalance,
    todayRevenue,
    pendingCount: pendingCount ?? 0,
    totalPayments: allConfirmed?.length ?? 0,
    recentPayments: recentPayments ?? [],
    currency: merchant.currency,
    displayCurrency,
    exchangeRate: exchangeRate ?? 1,
    settlementToken: merchant.settlement_token,
    settlementChain: merchant.settlement_chain,
    businessName: merchant.business_name,
    onboardingChecklist: merchant.onboarding_checklist ?? null,
    firstPaymentCelebrated: merchant.first_payment_celebrated ?? false,
    merchantId: merchant.id,
  });
}
