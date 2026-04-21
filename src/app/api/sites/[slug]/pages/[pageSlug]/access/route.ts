import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookAdminClient } from "@/lib/book/book-client";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { resolveAccess, type WalletClaim } from "@/lib/book/paywall";

/**
 * Public access check for a published page.
 *
 * POST { wallets: [{chain, address}] }
 * Returns the gating verdict + the page content when access is granted.
 */

const schema = z.object({
  wallets: z
    .array(
      z.object({
        chain: z.string().min(1).max(20),
        address: z.string().min(1).max(200),
      }),
    )
    .max(10)
    .default([]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; pageSlug: string }> },
) {
  const { slug, pageSlug } = await params;
  const ip = getClientIp(request);
  if (isRateLimited(`sites-access:${ip}:${slug}`, { max: 30, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({ wallets: [] }));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const bookDb = getBookAdminClient();

  // Resolve the space (slug OR custom_domain).
  let { data: space } = await bookDb
    .from("bb_spaces")
    .select("id, is_published")
    .eq("slug", slug)
    .maybeSingle();
  if (!space) {
    const { data: byDomain } = await bookDb
      .from("bb_spaces")
      .select("id, is_published")
      .eq("custom_domain", slug)
      .maybeSingle();
    space = byDomain;
  }
  if (!space || !space.is_published) {
    return NextResponse.json({ error: "Not published" }, { status: 404 });
  }

  const { data: page } = await bookDb
    .from("bb_pages")
    .select("id, title, slug, content")
    .eq("space_id", space.id)
    .eq("slug", pageSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const wallets: WalletClaim[] = parsed.data.wallets;
  const verdict = await resolveAccess(space.id, page.id, wallets);

  return NextResponse.json({
    verdict: {
      gated: verdict.gated,
      granted: verdict.granted,
      reason: verdict.reason,
      rules: verdict.rules.map((r) => ({
        id: r.id,
        chain: r.chain,
        contract_address: r.contract_address,
        token_type: r.token_type,
        min_amount: r.min_amount,
        token_id: r.token_id,
      })),
      paidContent: verdict.paidContent.map((p) => ({
        id: p.id,
        page_id: p.page_id,
        price_usd: p.price_usd,
        accepted_tokens: p.accepted_tokens,
      })),
    },
    content: verdict.granted ? page.content : null,
  });
}
