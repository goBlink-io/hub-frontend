import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resubmit, ZionError } from "@/lib/server/zion";
import {
  bumpResubmitCount,
  getUserAuditByAuditId,
  insertAudit,
} from "@/lib/server/zion-db";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { ZION_ACCEPTED_EXTENSIONS } from "@/types/audit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resubmitLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });

function getMaxBytes(): number {
  const raw = parseInt(process.env.ZION_MAX_UPLOAD_BYTES || "10485760", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10_485_760;
}

function validateExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ZION_ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = resubmitLimiter.check(user.id);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many resubmissions. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const originalAuditId = form.get("originalAuditId");
  if (typeof originalAuditId !== "string" || !originalAuditId.trim()) {
    return NextResponse.json(
      { error: "originalAuditId is required" },
      { status: 400 },
    );
  }
  const parentAuditId = originalAuditId.trim();

  // Authorise + fetch the server-held reaudit token.
  const parent = await getUserAuditByAuditId(user.id, parentAuditId);
  if (!parent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!parent.reaudit_token) {
    return NextResponse.json(
      { error: "This audit is not eligible for a free resubmit." },
      { status: 409 },
    );
  }

  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { error: "At least one file is required" },
      { status: 400 },
    );
  }

  const maxBytes = getMaxBytes();
  const filenames: string[] = [];
  let totalBytes = 0;
  for (const file of files) {
    if (!validateExtension(file.name)) {
      return NextResponse.json(
        {
          error: `File "${file.name}" has an unsupported extension. Allowed: ${ZION_ACCEPTED_EXTENSIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `File "${file.name}" exceeds the ${Math.floor(maxBytes / 1024 / 1024)} MiB per-file limit`,
          maxBytes,
        },
        { status: 413 },
      );
    }
    filenames.push(file.name);
    totalBytes += file.size;
  }

  // Rebuild the outbound multipart. We attach the reaudit_token server-side;
  // it must never cross the browser boundary.
  const outbound = new FormData();
  for (const file of files) outbound.append("files", file, file.name);
  outbound.append("originalAuditId", parentAuditId);
  outbound.append("reauditToken", parent.reaudit_token);
  const suiExecutionMode = form.get("suiExecutionMode");
  if (typeof suiExecutionMode === "string" && suiExecutionMode) {
    outbound.append("suiExecutionMode", suiExecutionMode);
  }

  try {
    const job = await resubmit(outbound);
    await insertAudit({
      userId: user.id,
      job,
      sourceType: "upload",
      sourceMeta: {
        filenames,
        totalBytes,
        suiExecutionMode:
          typeof suiExecutionMode === "string" ? suiExecutionMode : undefined,
      },
      parentAuditId,
    });
    // Fire-and-forget — parent's counter is advisory.
    void bumpResubmitCount(parentAuditId);
    return NextResponse.json(job, { status: 202 });
  } catch (err) {
    if (err instanceof ZionError) {
      const headers: Record<string, string> = {};
      if (err.retryAfterSec) headers["Retry-After"] = String(err.retryAfterSec);
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status, headers },
      );
    }
    logger.error("[zion/resubmit] unexpected error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
