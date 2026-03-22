import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: webhook } = await adminSupabase
    .from("webhook_endpoints")
    .select("id, merchants!inner(user_id)")
    .eq("id", id)
    .single();

  if (!webhook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const merchant = webhook.merchants as unknown as { user_id: string };
  if (merchant.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = (page - 1) * limit;

  const { data: deliveries, count } = await adminSupabase
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
