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
  const endpointId = params.get("endpoint_id");
  const eventType = params.get("event_type");
  const status = params.get("status");

  // Get merchant's webhook endpoint IDs
  const { data: endpoints } = await ctx.merchantDb
    .from("webhook_endpoints")
    .select("id")
    .eq("merchant_id", merchant.id);

  if (!endpoints || endpoints.length === 0) {
    return NextResponse.json({ data: [], total: 0, totalPages: 0 });
  }

  const endpointIds = endpoints.map((e) => e.id);

  let query = ctx.merchantDb
    .from("webhook_deliveries")
    .select("*, webhook_endpoints(id, url, events)", { count: "exact" })
    .in("webhook_endpoint_id", endpointIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (endpointId && endpointId !== "all") {
    query = query.eq("webhook_endpoint_id", endpointId);
  }

  if (eventType && eventType !== "all") {
    query = query.eq("event", eventType);
  }

  if (status === "success") {
    query = query.gte("response_status", 200).lt("response_status", 300);
  } else if (status === "failed") {
    query = query.or("response_status.is.null,response_status.lt.200,response_status.gte.300");
  }

  const { data: deliveries, count } = await query;

  return NextResponse.json({
    data: deliveries ?? [],
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
