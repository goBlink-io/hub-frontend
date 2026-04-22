import { NextRequest, NextResponse } from "next/server";
import { getMerchantContext } from "@/lib/server/merchant-client";

export const dynamic = "force-dynamic";

/** Prevent CSV injection — prefix formula-triggering characters */
function csvSafe(value: string): string {
  if (!value) return '';
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await ctx.merchantDb
    .from("merchants")
    .select("id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const params = request.nextUrl.searchParams;
  const startDate = params.get("start");
  const endDate = params.get("end");
  const isTest = params.get("is_test") === "true";

  let query = ctx.merchantDb
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
    csvSafe(p.external_order_id || ""),
    p.amount,
    p.net_amount || "",
    p.fee_amount || "",
    csvSafe(p.currency),
    p.crypto_amount || "",
    csvSafe(p.crypto_token || ""),
    csvSafe(p.crypto_chain || ""),
    csvSafe(p.status),
    csvSafe(p.customer_wallet || ""),
    p.created_at,
    p.confirmed_at || "",
    csvSafe(p.settlement_status || ""),
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
