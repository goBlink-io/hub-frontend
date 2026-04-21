import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookAdminClient } from "@/lib/book/book-client";

/**
 * Purchase update endpoint.
 *
 * PATCH: visitor-side. Supplies a tx_hash; status flips to 'submitted'.
 *        Owner dashboard then moves it to 'confirmed' (or rejects).
 *        v1 intentionally does not auto-verify — that's cross-chain
 *        tx verification, significant surface area.
 *
 * DELETE: owner-side confirmation flow — future. For now, leaving as
 *         unimplemented (404) so the UI knows to use a dashboard-level
 *         flow to reject.
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
    .select("id, buyer_wallet, status")
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

  const { data, error } = await bookDb
    .from("bb_purchases")
    .update({ tx_hash: parsed.data.tx_hash, status: "submitted" })
    .eq("id", purchaseId)
    .select("id, status, tx_hash")
    .maybeSingle();

  if (error) {
    console.error("[purchase-patch]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}
