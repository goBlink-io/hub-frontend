import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

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
    .from("bb_versions")
    .select("*")
    .eq("space_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[versions-get]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

const createVersionSchema = z.object({
  label: z.string().min(1).max(50),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (!role || role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { data: version, error: vError } = await ctx.bookDb
    .from("bb_versions")
    .insert({ space_id: id, label: parsed.data.label })
    .select()
    .single();

  if (vError) {
    console.error("[versions-post]", vError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const { data: pages } = await ctx.bookDb
    .from("bb_pages")
    .select("*")
    .eq("space_id", id)
    .eq("is_published", true)
    .order("position", { ascending: true });

  if (pages && pages.length > 0) {
    // Snapshot includes full page metadata — SEO fields preserved so
    // restore round-trips without data loss.
    const versionPages = pages.map((p) => ({
      version_id: version.id,
      page_id: p.id,
      title: p.title,
      slug: p.slug,
      content: p.content,
      parent_id: p.parent_id,
      position: p.position,
    }));
    await ctx.bookDb.from("bb_version_pages").insert(versionPages);
  }

  return NextResponse.json(version, { status: 201 });
}
