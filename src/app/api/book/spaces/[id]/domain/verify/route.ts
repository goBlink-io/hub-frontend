import { NextResponse } from "next/server";
import { getBookContext } from "@/lib/book/book-client";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { verifyCustomDomain } from "@/lib/book/verify-domain";

export const runtime = "nodejs"; // dns/promises is node-only

/**
 * POST — trigger DNS verification for the space's custom domain.
 *
 * Only the space owner can run this. On success, flips
 * custom_domain_verified to true and stamps custom_domain_verified_at.
 * On failure, returns the reason so the settings UI can surface it.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: space } = await ctx.bookDb
    .from("bb_spaces")
    .select("custom_domain")
    .eq("id", id)
    .maybeSingle();

  if (!space?.custom_domain) {
    return NextResponse.json(
      { error: "No custom domain set" },
      { status: 400 },
    );
  }

  const result = await verifyCustomDomain(space.custom_domain);

  if (result.verified) {
    await ctx.bookDb
      .from("bb_spaces")
      .update({
        custom_domain_verified: true,
        custom_domain_verified_at: new Date().toISOString(),
      })
      .eq("id", id);
  } else {
    // Ensure the flag stays false if a previously-verified domain has
    // since drifted (user re-pointed their DNS).
    await ctx.bookDb
      .from("bb_spaces")
      .update({
        custom_domain_verified: false,
        custom_domain_verified_at: null,
      })
      .eq("id", id);
  }

  return NextResponse.json(result, {
    status: result.verified ? 200 : 422,
  });
}
