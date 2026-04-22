import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMerchantAdminClient } from "@/lib/server/merchant-client";
import { MerchantTestModeProvider } from "@/contexts/MerchantTestModeContext";
import { MerchantNav } from "@/components/merchant/MerchantNav";
import { TestModeBar } from "@/components/merchant/TestModeBar";

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const blink = await createClient();
  const {
    data: { user },
  } = await blink.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const merchantDb = getMerchantAdminClient();
  const { data: merchant } = await merchantDb
    .from("merchants")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  // If no merchant record or onboarding not completed, send to onboarding
  // But allow the onboarding page itself to render
  if (!merchant || !merchant.onboarding_completed) {
    // Don't redirect if already on onboarding page (checked via header or just allow it through)
  }

  return (
    <MerchantTestModeProvider>
      <TestModeBar />
      <MerchantNav />
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        {children}
      </div>
    </MerchantTestModeProvider>
  );
}
