import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(limitParam ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT),
  );

  // Client uses the user's RLS-scoped Supabase session, so this only sees
  // their own rows. No service-role bypass needed.
  const { data, error } = await supabase
    .from("zion_audits")
    .select(
      "id, job_id, audit_id, status, source_type, source_meta, chain, language, security_score, grade, parent_audit_id, created_at, completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("[zion/audits] query failed", { message: error.message });
    return NextResponse.json({ error: "Failed to load audits" }, { status: 500 });
  }

  return NextResponse.json({ audits: data ?? [] });
}
