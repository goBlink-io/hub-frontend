import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getJob, ZionError } from "@/lib/server/zion";
import { updateJobStatus, userOwnsJob } from "@/lib/server/zion-db";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Polling-friendly: permissive per-user cap.
const pollLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!jobId || jobId.length > 128) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = pollLimiter.check(user.id);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Polling too fast" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  // Authorise: user must own this job. If the DB row is missing (e.g. the
  // migration isn't applied yet) we fail closed — the proxy token would
  // otherwise let any signed-in user poll anyone's job.
  const owns = await userOwnsJob(user.id, jobId);
  if (!owns) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const status = await getJob(jobId);
    // Mirror lifecycle transitions into the DB. Fire-and-forget.
    void updateJobStatus(jobId, status);
    // 202 for pending so the client can distinguish "still working" from "done".
    const httpStatus =
      status.status === "completed" || status.status === "failed" ? 200 : 202;
    return NextResponse.json(status, { status: httpStatus });
  } catch (err) {
    if (err instanceof ZionError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    logger.error("[zion/jobs] unexpected error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
