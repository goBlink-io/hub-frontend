import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";
import { isAdmin } from "@/lib/server/authz";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const VALID_STATUS = new Set(["queued", "running", "completed", "failed"]);
const VALID_SOURCE = new Set(["upload", "github"]);

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(sp.get("limit") ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT),
  );
  const offset = Math.max(0, parseInt(sp.get("offset") ?? "0", 10) || 0);
  const statusFilter = sp.get("status");
  const sourceFilter = sp.get("source");
  const userFilter = sp.get("user");

  // Service-role query — admin view crosses user boundaries.
  let query = adminSupabase
    .from("zion_audits")
    .select(
      "id, user_id, job_id, audit_id, status, source_type, source_meta, chain, language, security_score, grade, parent_audit_id, resubmit_count, created_at, completed_at, error_message",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter && VALID_STATUS.has(statusFilter)) {
    query = query.eq("status", statusFilter);
  }
  if (sourceFilter && VALID_SOURCE.has(sourceFilter)) {
    query = query.eq("source_type", sourceFilter);
  }
  if (userFilter) {
    query = query.eq("user_id", userFilter);
  }

  const { data, error, count } = await query;
  if (error) {
    logger.error("[admin/audits] query failed", { message: error.message });
    return NextResponse.json({ error: "Failed to load audits" }, { status: 500 });
  }

  return NextResponse.json({
    audits: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
