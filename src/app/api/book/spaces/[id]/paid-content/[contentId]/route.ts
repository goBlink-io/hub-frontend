import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

const acceptedTokenSchema = z.object({
  chain: z.string().min(1).max(20),
  symbol: z.string().min(1).max(20),
  contract_address: z.string().max(200).optional(),
  decimals: z.number().int().min(0).max(32).optional(),
});

const updatePaidSchema = z.object({
  price_usd: z.number().positive().optional(),
  accepted_tokens: z.array(acceptedTokenSchema).min(1).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contentId: string }> },
) {
  const { id, contentId } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updatePaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { data, error } = await ctx.bookDb
    .from("bb_paid_content")
    .update(parsed.data)
    .eq("id", contentId)
    .eq("space_id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[paid-content-patch]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contentId: string }> },
) {
  const { id, contentId } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row } = await ctx.bookDb
    .from("bb_paid_content")
    .select("page_id")
    .eq("id", contentId)
    .eq("space_id", id)
    .maybeSingle();

  const { error } = await ctx.bookDb
    .from("bb_paid_content")
    .delete()
    .eq("id", contentId)
    .eq("space_id", id);
  if (error) {
    console.error("[paid-content-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // If this was page-scoped and no other active paid_content rows cover
  // the same page, flip bb_pages.is_premium back to false.
  if (row?.page_id) {
    const { count } = await ctx.bookDb
      .from("bb_paid_content")
      .select("*", { count: "exact", head: true })
      .eq("page_id", row.page_id)
      .eq("is_active", true);
    if ((count ?? 0) === 0) {
      await ctx.bookDb
        .from("bb_pages")
        .update({ is_premium: false })
        .eq("id", row.page_id);
    }
  }

  // Maintain space monetization flag.
  const { count: spaceCount } = await ctx.bookDb
    .from("bb_paid_content")
    .select("*", { count: "exact", head: true })
    .eq("space_id", id)
    .eq("is_active", true);
  if ((spaceCount ?? 0) === 0) {
    await ctx.bookDb
      .from("bb_spaces")
      .update({ monetization_enabled: false })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}
