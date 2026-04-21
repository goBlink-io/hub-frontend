import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

/**
 * Paid-content pricing rules. Each row attaches a USD price + a list of
 * accepted on-chain tokens to a space (all pages in that space) or a
 * specific page. bb_purchases join to resolve whether a given buyer
 * wallet has paid.
 */

const acceptedTokenSchema = z.object({
  chain: z.string().min(1).max(20),
  symbol: z.string().min(1).max(20),
  contract_address: z.string().max(200).optional(),
  decimals: z.number().int().min(0).max(32).optional(),
});

const createPaidSchema = z.object({
  page_id: z.string().uuid().nullable().optional(),
  price_usd: z.number().positive(),
  accepted_tokens: z.array(acceptedTokenSchema).min(1),
  is_active: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await ctx.bookDb
    .from("bb_paid_content")
    .select("*")
    .eq("space_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[paid-content-get]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Also set the page-level is_premium flag for quick rendering checks.
  if (parsed.data.page_id) {
    await ctx.bookDb
      .from("bb_pages")
      .update({ is_premium: true })
      .eq("id", parsed.data.page_id)
      .eq("space_id", id);
  }

  const { data, error } = await ctx.bookDb
    .from("bb_paid_content")
    .insert({
      space_id: id,
      page_id: parsed.data.page_id ?? null,
      price_usd: parsed.data.price_usd,
      accepted_tokens: parsed.data.accepted_tokens,
      is_active: parsed.data.is_active ?? true,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[paid-content-post]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  await ctx.bookDb
    .from("bb_spaces")
    .update({ monetization_enabled: true })
    .eq("id", id);

  return NextResponse.json(data, { status: 201 });
}
