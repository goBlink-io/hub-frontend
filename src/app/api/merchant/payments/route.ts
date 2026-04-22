import { NextRequest, NextResponse } from "next/server";
import { getMerchantContext } from "@/lib/server/merchant-client";

export const dynamic = "force-dynamic";

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
  const page = parseInt(params.get("page") || "1", 10);
  const limit = Math.min(parseInt(params.get("limit") || "20", 10), 50);
  const offset = (page - 1) * limit;
  const status = params.get("status");
  const isTest = params.get("is_test") === "true";

  let query = ctx.merchantDb
    .from("payments")
    .select("*", { count: "exact" })
    .eq("merchant_id", merchant.id)
    .eq("is_test", isTest)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: payments, count } = await query;

  return NextResponse.json({
    data: payments ?? [],
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
