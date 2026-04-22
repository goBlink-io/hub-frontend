import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMerchantAdminClient } from "@/lib/server/merchant-client";
import { WebhooksContent } from "@/components/merchant/WebhooksContent";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Webhooks — Merchant" };
export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const blink = await createClient();

  const { data: { user } } = await blink.auth.getUser();
  if (!user) redirect("/login");

  const merchantDb = getMerchantAdminClient();
  const { data: merchant } = await merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!merchant) redirect("/merchant/onboarding");

  const { data: webhooks } = await merchantDb
    .from("webhook_endpoints")
    .select("id, url, events, is_active, created_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Webhooks
        </h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Manage endpoints and inspect delivery history.
        </p>
      </div>

      <WebhooksContent merchantId={merchant.id} webhooks={webhooks ?? []} />
    </div>
  );
}
