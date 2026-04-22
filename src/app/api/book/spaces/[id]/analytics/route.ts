import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookAdminClient, getBookContext } from "@/lib/book/book-client";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

/**
 * Space analytics.
 *
 * GET (authed): aggregates total pageviews, unique visitors, daily chart,
 *   and top pages from the last 30 days. Owners / team members only.
 *
 * POST (public): ingests a pageview / search / feedback event from the
 *   published site renderer. Rate-limited per IP. Only accepts events
 *   for published spaces to prevent draft-leak tracking.
 */

const EVENT_VALUES = ["pageview", "search", "feedback"] as const;

const ingestSchema = z.object({
  page_id: z.string().uuid().nullable().optional(),
  event: z.enum(EVENT_VALUES).default("pageview"),
  visitor_id: z.string().max(128).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

interface DailyRow {
  date: string;
  count: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const days = Math.min(
    90,
    Math.max(1, parseInt(searchParams.get("days") ?? "30", 10) || 30),
  );
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days + 1);
  sinceDate.setHours(0, 0, 0, 0);
  const sinceIso = sinceDate.toISOString();
  const sinceDateStr = sinceIso.slice(0, 10);

  // Query daily rollups (cheap) + recent raw events (same-day).
  const [rollupRes, rawRes] = await Promise.all([
    ctx.bookDb
      .from("bb_analytics_daily")
      .select("date, event, count, unique_visitors, page_id")
      .eq("space_id", id)
      .eq("event", "pageview")
      .gte("date", sinceDateStr),
    ctx.bookDb
      .from("bb_analytics")
      .select("page_id, visitor_id, created_at, event")
      .eq("space_id", id)
      .eq("event", "pageview")
      .gte("created_at", sinceIso),
  ]);

  if (rollupRes.error && rawRes.error) {
    console.error("[analytics-get]", rollupRes.error, rawRes.error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 },
    );
  }

  const rollup = rollupRes.data ?? [];
  const raw = rawRes.data ?? [];

  const byDate = new Map<string, DailyRow>();
  for (const row of rollup) {
    const prev = byDate.get(row.date) ?? { date: row.date, count: 0 };
    prev.count += row.count ?? 0;
    byDate.set(row.date, prev);
  }
  const rawByDate = new Map<string, { count: number; visitors: Set<string> }>();
  for (const r of raw) {
    const d = r.created_at.slice(0, 10);
    const b = rawByDate.get(d) ?? { count: 0, visitors: new Set() };
    b.count += 1;
    if (r.visitor_id) b.visitors.add(r.visitor_id);
    rawByDate.set(d, b);
  }
  // Merge raw same-day into rollups (raw wins for today where rollup is stale).
  for (const [d, b] of rawByDate) {
    byDate.set(d, { date: d, count: Math.max(b.count, byDate.get(d)?.count ?? 0) });
  }

  // Fill in missing dates with 0s so the chart is continuous.
  const daily: DailyRow[] = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(sinceDate);
    dt.setDate(sinceDate.getDate() + i);
    const key = dt.toISOString().slice(0, 10);
    daily.push(byDate.get(key) ?? { date: key, count: 0 });
  }

  const totalPageviews = daily.reduce((s, d) => s + d.count, 0);

  // Unique visitors over the window (approx — union of raw visitor_ids).
  const uniqueVisitors = new Set<string>();
  for (const r of raw) if (r.visitor_id) uniqueVisitors.add(r.visitor_id);

  // Top pages from raw (cheap) — if raw is thin, augment with rollup per page_id.
  const pageCounts = new Map<string, number>();
  for (const r of raw) {
    if (!r.page_id) continue;
    pageCounts.set(r.page_id, (pageCounts.get(r.page_id) ?? 0) + 1);
  }
  for (const r of rollup) {
    if (!r.page_id) continue;
    pageCounts.set(r.page_id, (pageCounts.get(r.page_id) ?? 0) + (r.count ?? 0));
  }
  const topPages = Array.from(pageCounts.entries())
    .map(([page_id, count]) => ({ page_id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    totalPageviews,
    uniqueVisitors: uniqueVisitors.size,
    daily,
    topPages,
    windowDays: days,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // IP-bucketed rate limit to cap the public ingest at a reasonable level.
  const ip = getClientIp(request);
  if (
    isRateLimited(`book-analytics-ingest:${ip}:${id}`, {
      max: 60,
      windowMs: 60_000,
    })
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const bookDb = getBookAdminClient();

  // Only accept events for published spaces.
  const { data: space } = await bookDb
    .from("bb_spaces")
    .select("id, is_published")
    .eq("id", id)
    .maybeSingle();
  if (!space || !space.is_published) {
    return NextResponse.json({ error: "Not published" }, { status: 404 });
  }

  const { error } = await bookDb.from("bb_analytics").insert({
    space_id: id,
    page_id: parsed.data.page_id ?? null,
    event: parsed.data.event,
    visitor_id: parsed.data.visitor_id ?? null,
    metadata: parsed.data.metadata ?? {},
  });
  if (error) {
    console.error("[analytics-ingest]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
