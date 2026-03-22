import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentsList } from "@/components/merchant/PaymentsList";
import { getExchangeRate } from "@/lib/merchant/forex";
import { Download } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payments — Merchant" };
export const dynamic = "force-dynamic";

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; is_test?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, currency, display_currency")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/merchant/onboarding");

  const parsedPage = parseInt(params.page || "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  const perPage = 20;
  const offset = (page - 1) * perPage;
  const isTest = params.is_test === "true";

  let query = supabase
    .from("payments")
    .select("*", { count: "exact" })
    .eq("merchant_id", merchant.id)
    .eq("is_test", isTest)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.search) {
    const sanitized = params.search.replace(/[,.*()%_\\;'"]/g, "").slice(0, 100);
    if (sanitized) {
      const term = `%${sanitized}%`;
      const uuidMatch = isUUID(sanitized) ? sanitized : "00000000-0000-0000-0000-000000000000";
      query = query.or(
        `external_order_id.ilike.${term},send_tx_hash.ilike.${term},fulfillment_tx_hash.ilike.${term},id.eq.${uuidMatch}`
      );
    }
  }

  const { data: payments, count } = await query;

  const displayCurrency = merchant.display_currency || "USD";
  const exchangeRate = await getExchangeRate(displayCurrency);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Payments
          </h1>
          <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>
            View and manage all your payment transactions.
          </p>
        </div>
        <Link
          href="/merchant/export"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
            minHeight: "44px",
          }}
        >
          <Download className="h-4 w-4" />
          Export
        </Link>
      </div>

      <PaymentsList
        payments={payments ?? []}
        totalCount={count ?? 0}
        currentPage={page}
        perPage={perPage}
        currency={merchant.currency}
        displayCurrency={displayCurrency}
        exchangeRate={exchangeRate ?? 1}
        currentStatus={params.status || "all"}
        currentSearch={params.search || ""}
        merchantId={merchant.id}
      />
    </div>
  );
}
