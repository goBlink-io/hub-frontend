import { NextResponse } from "next/server";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";
import { tiptapToMarkdown } from "@/lib/book/tiptap-to-markdown";
import type { TiptapDoc } from "@/types/book";

/**
 * Space export.
 *
 * Returns a single JSON bundle containing space metadata + every page's
 * Tiptap content AND its rendered Markdown. Deliberately not a ZIP so
 * we stay dependency-free — callers who want individual .md files can
 * split by `pages[].slug` client-side.
 *
 * Owners only. Content-Disposition hints for a sensible filename.
 */

export async function GET(
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

  const { data: space, error: spaceErr } = await ctx.bookDb
    .from("bb_spaces")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (spaceErr || !space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: pages, error: pagesErr } = await ctx.bookDb
    .from("bb_pages")
    .select("id, title, slug, content, parent_id, position, is_published, meta_title, meta_description, og_image_url, noindex, created_at, updated_at")
    .eq("space_id", id)
    .order("position", { ascending: true });
  if (pagesErr) {
    console.error("[export]", pagesErr);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const bundle = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    space: {
      id: space.id,
      name: space.name,
      slug: space.slug,
      description: space.description,
      theme: space.theme,
      custom_domain: space.custom_domain,
      is_published: space.is_published,
      meta_title: space.meta_title,
      meta_description: space.meta_description,
      brand: {
        logo_url: space.brand_logo_url,
        primary_color: space.brand_primary_color,
        accent_color: space.brand_accent_color,
        font: space.brand_font,
        hide_powered_by: space.brand_hide_powered_by,
      },
    },
    pages: (pages ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      parent_id: p.parent_id,
      position: p.position,
      is_published: p.is_published,
      meta_title: p.meta_title,
      meta_description: p.meta_description,
      og_image_url: p.og_image_url,
      noindex: p.noindex,
      content: p.content,
      markdown: tiptapToMarkdown((p.content as TiptapDoc | null) ?? {
        type: "doc",
        content: [],
      }),
      created_at: p.created_at,
      updated_at: p.updated_at,
    })),
  };

  const filename = `${space.slug}-export-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  return new Response(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // POST is a no-op alias for GET — some frontends prefer POST for
  // "action" endpoints. Keeps the UI flexible.
  return GET(_request, { params });
}
