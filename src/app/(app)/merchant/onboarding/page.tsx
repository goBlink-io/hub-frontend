import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/merchant/OnboardingWizard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Onboarding — Merchant" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, business_name, currency, timezone, onboarding_completed")
    .eq("user_id", user.id)
    .single();

  // If no merchant record exists, create one
  if (!merchant) {
    const { data: newMerchant, error } = await supabase
      .from("merchants")
      .insert({
        user_id: user.id,
        business_name: "",
        currency: "USD",
        onboarding_completed: false,
      })
      .select("id, business_name, currency, timezone, onboarding_completed")
      .single();

    if (error || !newMerchant) {
      redirect("/login");
    }

    return (
      <OnboardingWizard
        merchantId={newMerchant.id}
        businessName={newMerchant.business_name}
        currentCurrency={newMerchant.currency}
        currentTimezone={newMerchant.timezone ?? "UTC"}
        alreadyCompleted={false}
      />
    );
  }

  return (
    <OnboardingWizard
      merchantId={merchant.id}
      businessName={merchant.business_name}
      currentCurrency={merchant.currency}
      currentTimezone={merchant.timezone ?? "UTC"}
      alreadyCompleted={merchant.onboarding_completed}
    />
  );
}
