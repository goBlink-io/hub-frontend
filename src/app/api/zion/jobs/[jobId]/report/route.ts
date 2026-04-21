import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReport, ZionError } from "@/lib/server/zion";
import { userOwnsJob } from "@/lib/server/zion-db";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { logger } from "@/lib/logger";
import type { ReportFormat } from "@/types/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_FORMATS: readonly ReportFormat[] = [
  "json",
  "md",
  "html",
  "pdf",
  "audit-html",
];

const downloadLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!jobId || jobId.length > 128) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  const formatParam = request.nextUrl.searchParams.get("format") ?? "json";
  if (!VALID_FORMATS.includes(formatParam as ReportFormat)) {
    return NextResponse.json(
      { error: `Invalid format. Allowed: ${VALID_FORMATS.join(", ")}` },
      { status: 400 },
    );
  }
  const format = formatParam as ReportFormat;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = downloadLimiter.check(user.id);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many downloads" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  if (!(await userOwnsJob(user.id, jobId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const report = await getReport(jobId, format);
    // 409 / 503 pass through unchanged — client needs to distinguish.
    if (report.status === 409) {
      return NextResponse.json(
        { error: "Report not ready — audit is still running." },
        { status: 409 },
      );
    }
    if (report.status === 503) {
      return NextResponse.json(
        { error: "Report format unavailable for this audit." },
        { status: 503 },
      );
    }

    const headers = new Headers({ "Content-Type": report.contentType });
    if (report.contentDisposition) {
      headers.set("Content-Disposition", report.contentDisposition);
    } else if (format !== "json" && format !== "html" && format !== "audit-html") {
      // Force download for md / pdf when upstream didn't set it.
      const ext = format === "pdf" ? "pdf" : format;
      headers.set(
        "Content-Disposition",
        `attachment; filename="audit-${jobId}.${ext}"`,
      );
    }
    return new Response(report.body, { status: 200, headers });
  } catch (err) {
    if (err instanceof ZionError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    logger.error("[zion/report] unexpected error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
