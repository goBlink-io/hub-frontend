import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { enforceLimit, getRequiredPlan } from "@/lib/book/check-plan";
import { getBookContext } from "@/lib/book/book-client";

const createPageSchema = z.object({
  title: z.string().min(1).max(200).optional().default("Untitled"),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)
    .optional(),
  content: z.object({ type: z.literal("doc"), content: z.array(z.any()) }).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
  is_published: z.boolean().optional(),
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
    .from("bb_pages")
    .select("*")
    .eq("space_id", id)
    .order("position", { ascending: true });

  if (error) {
    console.error("[pages-get]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner" && role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canCreate = await enforceLimit(ctx.user.id, "pages");
  if (!canCreate) {
    return NextResponse.json(
      { error: "upgrade_required", plan: getRequiredPlan("pages") },
      { status: 402 },
    );
  }

  const body = await request.json();
  const parsed = createPageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { title, content, parent_id, position, is_published } = parsed.data;
  const slug =
    parsed.data.slug ??
    (title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "untitled");

  let pos = position;
  if (pos === undefined) {
    const { count } = await ctx.bookDb
      .from("bb_pages")
      .select("*", { count: "exact", head: true })
      .eq("space_id", id);
    pos = count ?? 0;
  }

  const { data, error } = await ctx.bookDb
    .from("bb_pages")
    .insert({
      space_id: id,
      title,
      slug,
      content: content ?? { type: "doc", content: [] },
      parent_id: parent_id ?? null,
      position: pos,
      is_published: is_published ?? true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A page with this slug already exists in this space" },
        { status: 409 },
      );
    }
    console.error("[pages-post]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
