import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

/**
 * Custom domain CRUD for a space.
 *
 * For v1 we store the domain and hand the user their CNAME / A-record
 * target. DNS verification is a separate follow-up — once it's wired we
 * add a `custom_domain_verified` column and gate serving on it. Until
 * then, operators are expected to aim their DNS at the hub's wildcard
 * host so Vercel (or the reverse proxy) picks up the traffic.
 */

const DOMAIN_RE = /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

const setDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(DOMAIN_RE, "Invalid domain")
    .nullable(),
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

  const { data } = await ctx.bookDb
    .from("bb_spaces")
    .select("custom_domain, slug")
    .eq("id", id)
    .maybeSingle();

  const target =
    process.env.BOOK_CUSTOM_DOMAIN_CNAME_TARGET || "cname.goblink.io";

  return NextResponse.json({
    domain: data?.custom_domain ?? null,
    slug: data?.slug ?? null,
    instructions: data?.custom_domain
      ? {
          type: "CNAME",
          name: data.custom_domain,
          target,
          note: "Point your domain at this CNAME target, then redeploy or wait for propagation.",
        }
      : null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = setDomainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid domain", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const domain = parsed.data.domain;

  // Uniqueness check (another space can't already claim this domain).
  if (domain) {
    const { data: clash } = await ctx.bookDb
      .from("bb_spaces")
      .select("id")
      .eq("custom_domain", domain)
      .neq("id", id)
      .maybeSingle();
    if (clash) {
      return NextResponse.json(
        { error: "Domain already in use by another space" },
        { status: 409 },
      );
    }
  }

  const { data, error } = await ctx.bookDb
    .from("bb_spaces")
    .update({ custom_domain: domain })
    .eq("id", id)
    .eq("user_id", ctx.user.id)
    .select("id, custom_domain")
    .maybeSingle();

  if (error) {
    console.error("[book/domain]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
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

  const { error } = await ctx.bookDb
    .from("bb_spaces")
    .update({ custom_domain: null })
    .eq("id", id)
    .eq("user_id", ctx.user.id);
  if (error) {
    console.error("[book/domain-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
