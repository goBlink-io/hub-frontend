import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MerchantTestModeProvider } from "@/contexts/MerchantTestModeContext";
import { MerchantNav } from "@/components/merchant/MerchantNav";
import { TestModeBar } from "@/components/merchant/TestModeBar";

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .single();

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
