import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
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
  last_reviewed_at: z.string().datetime().nullable().optional(),
  review_exempt: z.boolean().optional(),
  meta_title: z.string().max(200).nullable().optional(),
  meta_description: z.string().max(500).nullable().optional(),
  og_image_url: z.string().url().nullable().optional(),
  noindex: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const { id, pageId } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await ctx.bookDb
    .from("bb_pages")
    .select("*")
    .eq("id", pageId)
    .eq("space_id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const { id, pageId } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (!role || role === "viewer") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updatePageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await ctx.bookDb
    .from("bb_pages")
    .update(parsed.data)
    .eq("id", pageId)
    .eq("space_id", id)
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A page with this slug already exists in this space" },
        { status: 409 },
      );
    }
    console.error("[pages-pageId-patch]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const { id, pageId } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (!role || role === "viewer") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await ctx.bookDb
    .from("bb_pages")
    .delete()
    .eq("id", pageId)
    .eq("space_id", id);

  if (error) {
    console.error("[pages-pageId-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
