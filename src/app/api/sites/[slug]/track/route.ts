import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookAdminClient } from "@/lib/book/book-client";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

/**
 * Public analytics ingest for published book sites.
 * Accepts a batch of events from the client-side PageviewTracker so
 * navigator.sendBeacon can flush efficiently. Resolves the space by
 * slug OR custom_domain; only accepts events for published spaces.
 */

const trackSchema = z.object({
  events: z
    .array(
      z.object({
        event: z.enum(["pageview", "search", "feedback"]).default("pageview"),
        pageId: z.string().uuid().nullable().optional(),
        visitorId: z.string().max(128).optional(),
        timestamp: z.string().optional(),
      }),
    )
    .max(50),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = getClientIp(request);
  if (isRateLimited(`sites-track:${ip}:${slug}`, { max: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const bookDb = getBookAdminClient();
  // Resolve space by slug OR custom_domain.
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

  const rows = parsed.data.events.map((e) => ({
    space_id: space.id,
    page_id: e.pageId ?? null,
    event: e.event,
    visitor_id: e.visitorId ?? null,
    metadata: e.timestamp ? { ts: e.timestamp } : {},
  }));

  const { error } = await bookDb.from("bb_analytics").insert(rows);
  if (error) {
    console.error("[sites/track]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
