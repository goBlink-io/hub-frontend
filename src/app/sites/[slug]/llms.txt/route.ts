import { NextResponse } from "next/server";
import { getBookAdminClient } from "@/lib/book/book-client";
import { tiptapToMarkdown } from "@/lib/book/tiptap-to-markdown";
import type { BBPage, TiptapDoc } from "@/types/book";

/**
 * llms.txt renderer for a published space.
 *
 * Served at `/api/sites/[slug]/llms.txt` (redirected to from the
 * published site's `/llms.txt` root). Respects `bb_spaces.llms_txt_enabled`
 * — when false, returns 404 so crawlers don't index the content as
 * AI-training-eligible.
 *
 * Format follows the informal llms.txt convention:
 *   # Site Title
 *   > Short description
 *
 *   ## Page Title
 *   <markdown>
 *   ...
 */

export const revalidate = 900; // 15 minutes — trail the main page cache.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const bookDb = getBookAdminClient();

  let { data: space } = await bookDb
    .from("bb_spaces")
    .select("id, name, description, is_published, llms_txt_enabled")
    .eq("slug", slug)
    .maybeSingle();
  if (!space) {
    const { data: byDomain } = await bookDb
      .from("bb_spaces")
      .select("id, name, description, is_published, llms_txt_enabled")
      .eq("custom_domain", slug)
      .maybeSingle();
    space = byDomain;
  }
  if (!space || !space.is_published || !space.llms_txt_enabled) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: pages } = await bookDb
    .from("bb_pages")
    .select("title, slug, content, position, noindex, is_published")
    .eq("space_id", space.id)
    .eq("is_published", true)
    .order("position", { ascending: true });

  const lines: string[] = [];
  lines.push(`# ${space.name}`);
  if (space.description) {
    lines.push("");
    lines.push(`> ${space.description}`);
  }
  lines.push("");

  for (const p of (pages ?? []) as BBPage[]) {
    if (p.noindex) continue;
    lines.push(`## ${p.title}`);
    lines.push("");
    const md = tiptapToMarkdown(
      (p.content as TiptapDoc | null) ?? { type: "doc", content: [] },
    );
    lines.push(md.trim());
    lines.push("");
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}
