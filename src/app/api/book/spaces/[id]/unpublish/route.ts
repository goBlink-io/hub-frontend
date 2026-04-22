import { NextResponse } from "next/server";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

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

  const { data, error } = await ctx.bookDb
    .from("bb_spaces")
    .update({ is_published: false })
    .eq("id", id)
    .eq("user_id", ctx.user.id)
    .select("id, is_published")
    .maybeSingle();

  if (error) {
    console.error("[book/unpublish]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Symmetric with /publish — returns the same state info.
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data } = await ctx.bookDb
    .from("bb_spaces")
    .select("is_published")
    .eq("id", id)
    .maybeSingle();
  return NextResponse.json(data);
}
