import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookAdminClient } from "@/lib/book/book-client";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

/**
 * Visitor-side purchase intent for paid content.
 *
 * A visitor POSTs { paid_content_id, buyer_wallet, buyer_chain } and
 * receives a `purchase_id` and the owner's payout wallet so they can
 * send funds on-chain. Status starts at 'pending'. Once the visitor
 * has a tx_hash they POST /purchases/[id]/confirm.
 *
 * v1 does not verify tx on-chain — the owner reviews pending purchases
 * in the dashboard. Cross-chain tx verification is a follow-up.
 */

const createSchema = z.object({
  paid_content_id: z.string().uuid(),
  buyer_wallet: z.string().min(1).max(200),
  buyer_chain: z.string().min(1).max(20),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ip = getClientIp(request);
  if (isRateLimited(`purchase-create:${ip}:${id}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const bookDb = getBookAdminClient();
  const { data: content } = await bookDb
    .from("bb_paid_content")
    .select("id, space_id, price_usd, is_active")
    .eq("id", parsed.data.paid_content_id)
    .eq("space_id", id)
    .maybeSingle();

  if (!content || !content.is_active) {
    return NextResponse.json({ error: "Paid content not found" }, { status: 404 });
  }

  const { data: space } = await bookDb
    .from("bb_spaces")
    .select("payout_wallet")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await bookDb
    .from("bb_purchases")
    .insert({
      paid_content_id: content.id,
      buyer_wallet: parsed.data.buyer_wallet,
      buyer_chain: parsed.data.buyer_chain,
      tx_hash: "",
      amount_usd: content.price_usd,
      status: "pending",
    })
    .select("id, amount_usd, status, created_at")
    .maybeSingle();

  if (error) {
    console.error("[purchase-create]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(
    {
      purchase: data,
      payoutWallet: space?.payout_wallet ?? null,
    },
    { status: 201 },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  // Public endpoint — wallet scope acts as the auth (buyer lookup).
  const bookDb = getBookAdminClient();
  const { data: content } = await bookDb
    .from("bb_paid_content")
    .select("id")
    .eq("space_id", id);
  const contentIds = (content ?? []).map((c) => c.id);
  if (contentIds.length === 0) return NextResponse.json([]);

  const { data } = await bookDb
    .from("bb_purchases")
    .select("id, paid_content_id, buyer_wallet, buyer_chain, status, tx_hash, created_at")
    .in("paid_content_id", contentIds)
    .eq("buyer_wallet", wallet)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}
