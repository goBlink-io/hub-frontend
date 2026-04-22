import { NextRequest, NextResponse } from "next/server";
import { getMerchantContext } from "@/lib/server/merchant-client";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getMerchantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: webhook } = await ctx.merchantDb
    .from("webhook_endpoints")
    .select("id, merchants!inner(user_id)")
    .eq("id", id)
    .maybeSingle();

  if (!webhook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const merchant = webhook.merchants as unknown as { user_id: string };
  if (merchant.user_id !== ctx.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = (page - 1) * limit;

  const { data: deliveries, count } = await ctx.merchantDb
    .from("webhook_deliveries")
    .select("*", { count: "exact" })
    .eq("webhook_endpoint_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    data: deliveries ?? [],
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
