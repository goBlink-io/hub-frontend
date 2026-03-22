import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const params = request.nextUrl.searchParams;
  const startDate = params.get("start");
  const endDate = params.get("end");
  const isTest = params.get("is_test") === "true";

  let query = supabase
    .from("payments")
    .select("id, external_order_id, amount, net_amount, fee_amount, currency, crypto_amount, crypto_token, crypto_chain, status, customer_wallet, created_at, confirmed_at, settlement_status, settled_at")
    .eq("merchant_id", merchant.id)
    .eq("is_test", isTest)
    .order("created_at", { ascending: false });

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data: payments } = await query;

  if (!payments || payments.length === 0) {
    return new NextResponse("No payments found", { status: 404 });
  }

  // Generate CSV
  const headers = [
    "Payment ID", "Order ID", "Amount", "Net Amount", "Fee", "Currency",
    "Crypto Amount", "Token", "Chain", "Status", "Customer Wallet",
    "Created", "Confirmed", "Settlement Status", "Settled At",
  ];

  const rows = payments.map((p) => [
    p.id,
    p.external_order_id || "",
    p.amount,
    p.net_amount || "",
    p.fee_amount || "",
    p.currency,
    p.crypto_amount || "",
    p.crypto_token || "",
    p.crypto_chain || "",
    p.status,
    p.customer_wallet || "",
    p.created_at,
    p.confirmed_at || "",
    p.settlement_status || "",
    p.settled_at || "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
