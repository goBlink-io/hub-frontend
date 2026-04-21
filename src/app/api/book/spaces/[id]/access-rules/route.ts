import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

/**
 * Token-gated access rules for a space or a specific page.
 *
 * A rule declares "to view the gated content, the visitor's wallet must
 * hold at least `min_amount` of `token_type` at `contract_address` on
 * `chain` (optionally token_id for ERC-1155/NFT-specific gates)."
 *
 * Multiple rules stack per page/space — any-match grants access.
 */

const CHAIN_VALUES = [
  "evm",
  "solana",
  "sui",
  "near",
  "aptos",
  "bitcoin",
  "starknet",
  "ton",
  "tron",
] as const;

const TOKEN_TYPE_VALUES = [
  "native",
  "erc20",
  "erc721",
  "erc1155",
  "spl",
  "nft",
] as const;

const createRuleSchema = z.object({
  page_id: z.string().uuid().nullable().optional(),
  chain: z.enum(CHAIN_VALUES),
  contract_address: z.string().min(1).max(200),
  token_type: z.enum(TOKEN_TYPE_VALUES),
  min_amount: z.union([z.number().positive(), z.string().min(1).max(78)]).default(1),
  token_id: z.string().max(200).nullable().optional(),
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
    .from("bb_access_rules")
    .select("*")
    .eq("space_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[access-rules-get]", error);
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
  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await ctx.bookDb
    .from("bb_access_rules")
    .insert({
      space_id: id,
      page_id: parsed.data.page_id ?? null,
      chain: parsed.data.chain,
      contract_address: parsed.data.contract_address,
      token_type: parsed.data.token_type,
      min_amount: String(parsed.data.min_amount),
      token_id: parsed.data.token_id ?? null,
      is_active: parsed.data.is_active ?? true,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[access-rules-post]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  // Flip space to gated if any rule exists.
  await ctx.bookDb.from("bb_spaces").update({ is_gated: true }).eq("id", id);
  return NextResponse.json(data, { status: 201 });
}
