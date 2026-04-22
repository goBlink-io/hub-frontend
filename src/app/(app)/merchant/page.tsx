import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMerchantAdminClient } from "@/lib/server/merchant-client";
import { OverviewContent } from "@/components/merchant/OverviewContent";
import { getExchangeRate } from "@/lib/merchant/forex";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Merchant Dashboard" };
export const dynamic = "force-dynamic";

export default async function MerchantDashboardPage() {
  const blink = await createClient();
  const { data: { user } } = await blink.auth.getUser();
  if (!user) redirect("/login");

  const merchantDb = getMerchantAdminClient();
  const { data: merchant } = await merchantDb
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!merchant) redirect("/merchant/onboarding");
  if (!merchant.onboarding_completed) redirect("/merchant/onboarding");

  // Get today's start in UTC
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: recentPayments } = await merchantDb
    .from("payments")
    .select("id, external_order_id, amount, currency, status, created_at, is_test")
    .eq("merchant_id", merchant.id)
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: todayPayments } = await merchantDb
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", false)
    .gte("confirmed_at", todayStart.toISOString());

  const { count: pendingCount } = await merchantDb
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .eq("is_test", false)
    .in("status", ["pending", "processing"]);

  const { data: allConfirmed } = await merchantDb
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", false);

  const todayRevenue = todayPayments?.reduce(
    (sum, p) => sum + (Number(p.net_amount) || 0), 0
  ) ?? 0;

  const totalBalance = allConfirmed?.reduce(
    (sum, p) => sum + (Number(p.net_amount) || 0), 0
  ) ?? 0;

  const totalPayments = allConfirmed?.length ?? 0;

  const displayCurrency = merchant.display_currency || "USD";
  const exchangeRate = await getExchangeRate(displayCurrency);

  return (
    <>
    <h1 className="sr-only">Merchant Dashboard</h1>
    <OverviewContent
      data={{
        totalBalance,
        todayRevenue,
        pendingCount: pendingCount ?? 0,
        totalPayments,
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
      }}
    />
    </>
  );
}
