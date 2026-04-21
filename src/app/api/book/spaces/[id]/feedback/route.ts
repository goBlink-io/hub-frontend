import { NextResponse } from "next/server";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

/**
 * Space-level feedback. Owners / team members see the raw list + summary
 * aggregated per page — different from the public /api/book/feedback
 * endpoint which returns only summaries.
 */
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
  const limit = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10) || 100),
  );

  const { data: rows, error } = await ctx.bookDb
    .from("bb_feedback")
    .select("id, page_id, helpful, comment, user_fingerprint, created_at")
    .eq("space_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[space-feedback-get]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Summary per page
  const byPage = new Map<string, { helpful: number; notHelpful: number }>();
  for (const row of rows ?? []) {
    const bucket = byPage.get(row.page_id) ?? { helpful: 0, notHelpful: 0 };
    if (row.helpful) bucket.helpful++;
    else bucket.notHelpful++;
    byPage.set(row.page_id, bucket);
  }

  return NextResponse.json({
    entries: rows ?? [],
    summaries: Array.from(byPage.entries()).map(([page_id, c]) => ({
      page_id,
      helpful: c.helpful,
      notHelpful: c.notHelpful,
      total: c.helpful + c.notHelpful,
      helpfulPct:
        c.helpful + c.notHelpful > 0
          ? Math.round((c.helpful / (c.helpful + c.notHelpful)) * 100)
          : 0,
    })),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const feedbackId = searchParams.get("feedback_id");
  if (!feedbackId) {
    return NextResponse.json({ error: "feedback_id required" }, { status: 400 });
  }

  const { error } = await ctx.bookDb
    .from("bb_feedback")
    .delete()
    .eq("id", feedbackId)
    .eq("space_id", id);
  if (error) {
    console.error("[space-feedback-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
