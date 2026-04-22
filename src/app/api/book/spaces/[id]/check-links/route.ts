import { NextResponse } from "next/server";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";
import type { TiptapDoc } from "@/types/book";

/**
 * Broken-link checker for a space.
 *
 * GET: list broken links currently recorded on bb_broken_links.
 * POST: run a sync scan — walk every page's Tiptap content, extract
 *       link marks + image src URLs, HEAD each with a short timeout,
 *       store results on bb_broken_links. Owner/admin/editor only.
 *
 * Sync (not queued). For large spaces this can take seconds; the
 * response is gated on completion. Sufficient for v1 — a background
 * job is a later improvement.
 */

const LINK_CHECK_TIMEOUT_MS = 6_000;
const MAX_PARALLEL = 8;
const USER_AGENT = "goBlinkBook-LinkChecker/1.0";

interface DiscoveredLink {
  url: string;
  pageId: string;
  pageTitle: string;
  linkText: string | null;
}

interface CheckedLink extends DiscoveredLink {
  ok: boolean;
  statusCode: number | null;
  error: string | null;
}

interface TiptapNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: TiptapNode[];
}

function walk(
  doc: TiptapDoc | null,
  onLink: (url: string, text: string | null) => void,
): void {
  if (!doc?.content) return;
  const stack: TiptapNode[] = [...(doc.content as TiptapNode[])];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (n.type === "image" && typeof n.attrs?.src === "string") {
      onLink(n.attrs.src, null);
    }
    if (n.marks) {
      for (const m of n.marks) {
        if (m.type === "link" && typeof m.attrs?.href === "string") {
          onLink(m.attrs.href, n.text ?? null);
        }
      }
    }
    if (n.content) stack.push(...n.content);
  }
}

async function checkOne(link: DiscoveredLink): Promise<CheckedLink> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT_MS);
  try {
    // Skip fragment-only + mailto / tel / in-site paths.
    if (
      link.url.startsWith("#") ||
      link.url.startsWith("mailto:") ||
      link.url.startsWith("tel:")
    ) {
      return { ...link, ok: true, statusCode: null, error: null };
    }
    let target: string;
    try {
      const u = new URL(link.url);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { ...link, ok: true, statusCode: null, error: null };
      }
      target = u.toString();
    } catch {
      return {
        ...link,
        ok: false,
        statusCode: null,
        error: "Invalid URL",
      };
    }

    let res = await fetch(target, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
    });
    // Some servers disallow HEAD. Retry with GET.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(target, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT, Range: "bytes=0-0" },
      });
    }
    return {
      ...link,
      ok: res.ok || res.status === 206,
      statusCode: res.status,
      error: res.ok || res.status === 206 ? null : res.statusText || null,
    };
  } catch (err) {
    return {
      ...link,
      ok: false,
      statusCode: null,
      error:
        err instanceof Error
          ? err.name === "AbortError"
            ? "Timeout"
            : err.message
          : "Network error",
    };
  } finally {
    clearTimeout(to);
  }
}

async function runInBatches<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const results = await Promise.all(batch.map(fn));
    out.push(...results);
  }
  return out;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: spaceRow }, { data: broken }] = await Promise.all([
    ctx.bookDb
      .from("bb_spaces")
      .select("last_link_check_at")
      .eq("id", id)
      .maybeSingle(),
    ctx.bookDb
      .from("bb_broken_links")
      .select(
        "id, page_id, url, link_text, status_code, error, last_checked_at, is_broken",
      )
      .eq("space_id", id)
      .eq("is_broken", true)
      .order("last_checked_at", { ascending: false }),
  ]);

  return NextResponse.json({
    lastCheckedAt: spaceRow?.last_link_check_at ?? null,
    broken: broken ?? [],
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner" && role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Fetch all pages + their content.
  const { data: pages, error: pagesErr } = await ctx.bookDb
    .from("bb_pages")
    .select("id, title, content")
    .eq("space_id", id);
  if (pagesErr) {
    console.error("[check-links-scan]", pagesErr);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // 2. Walk and collect distinct URLs per page.
  const links: DiscoveredLink[] = [];
  for (const p of pages ?? []) {
    walk(p.content as TiptapDoc | null, (url, text) =>
      links.push({
        url,
        pageId: p.id,
        pageTitle: p.title,
        linkText: text,
      }),
    );
  }

  // 3. Check each URL.
  const checked = await runInBatches(links, MAX_PARALLEL, checkOne);

  // 4. Persist. Wipe previous rows first (simple snapshot model).
  await ctx.bookDb.from("bb_broken_links").delete().eq("space_id", id);
  const now = new Date().toISOString();
  const brokenRows = checked
    .filter((c) => !c.ok)
    .map((c) => ({
      space_id: id,
      page_id: c.pageId,
      url: c.url,
      link_text: c.linkText,
      status_code: c.statusCode,
      error: c.error,
      last_checked_at: now,
      is_broken: true,
    }));
  if (brokenRows.length > 0) {
    await ctx.bookDb.from("bb_broken_links").insert(brokenRows);
  }

  await ctx.bookDb
    .from("bb_spaces")
    .update({ last_link_check_at: now })
    .eq("id", id);

  return NextResponse.json({
    checked: checked.length,
    broken: brokenRows.length,
    lastCheckedAt: now,
  });
}
