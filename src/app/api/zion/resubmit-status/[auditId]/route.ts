import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResubmitStatus, ZionError } from "@/lib/server/zion";
import { getUserAuditByAuditId } from "@/lib/server/zion-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const { auditId } = await params;
  if (!auditId || auditId.length > 128) {
    return NextResponse.json({ error: "Invalid auditId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await getUserAuditByAuditId(user.id, auditId);
  if (!owner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const status = await getResubmitStatus(auditId);
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof ZionError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    logger.error("[zion/resubmit-status] unexpected error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
