import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookAdminClient } from "@/lib/book/book-client";
import { verifyPurchaseTx } from "@/lib/book/verify-purchase";

/**
 * Purchase update endpoint.
 *
 * PATCH: visitor-side. Supplies a tx_hash. We verify the tx on-chain
 *        against the claimed buyer wallet + the space's payout wallet.
 *        - on-chain verified  → status='confirmed' (auto)
 *        - on-chain rejected  → status='rejected'  (tx is fake or misdirected)
 *        - inconclusive (RPC down, unsupported chain) → status='submitted'
 *          (owner reviews manually in the dashboard)
 *
 * DELETE: owner-side flow — unimplemented, returns 404.
 */

const submitSchema = z.object({
  tx_hash: z.string().min(4).max(200),
  buyer_wallet: z.string().min(1).max(200),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ purchaseId: string }> },
) {
  const { purchaseId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const bookDb = getBookAdminClient();

  // Anti-hijack: the caller must supply the wallet that originally
  // created the purchase. No session in this flow (visitor is public).
  const { data: existing } = await bookDb
    .from("bb_purchases")
    .select("id, buyer_wallet, buyer_chain, status, paid_content_id")
    .eq("id", purchaseId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.buyer_wallet !== parsed.data.buyer_wallet) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.status === "confirmed" || existing.status === "rejected") {
    return NextResponse.json(
      { error: "Purchase already finalized" },
      { status: 409 },
    );
  }

  // Resolve the space's payout wallet via two lookups — keeps Supabase
  // query typing simple and works even without declared FK relationships.
  const { data: paidContent } = await bookDb
    .from("bb_paid_content")
    .select("space_id")
    .eq("id", existing.paid_content_id)
    .maybeSingle();

  const { data: space } = paidContent
    ? await bookDb
        .from("bb_spaces")
        .select("payout_wallet")
        .eq("id", paidContent.space_id)
        .maybeSingle()
    : { data: null };

  const payoutWallet = space?.payout_wallet as string | undefined;

  // Verify on-chain. Missing payout wallet → inconclusive (owner needs
  // to configure one before purchases can be auto-verified).
  const verification = payoutWallet
    ? await verifyPurchaseTx({
        chain: existing.buyer_chain,
        txHash: parsed.data.tx_hash,
        fromWallet: parsed.data.buyer_wallet,
        toWallet: payoutWallet,
      })
    : { status: "inconclusive" as const, reason: "space has no payout_wallet" };

  const nextStatus =
    verification.status === "confirmed"
      ? "confirmed"
      : verification.status === "rejected"
        ? "rejected"
        : "submitted";

  const updatePatch: Record<string, unknown> = {
    tx_hash: parsed.data.tx_hash,
    status: nextStatus,
  };

  const { data, error } = await bookDb
    .from("bb_purchases")
    .update(updatePatch)
    .eq("id", purchaseId)
    .select("id, status, tx_hash")
    .maybeSingle();

  if (error) {
    console.error("[purchase-patch]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({
    ...data,
    verification: {
      status: verification.status,
      reason: verification.reason,
      ...(verification.nativeAmount ? { nativeAmount: verification.nativeAmount } : {}),
      ...(verification.tokenAddress ? { tokenAddress: verification.tokenAddress } : {}),
    },
  });
}
