import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";
import { isAdmin } from "@/lib/server/authz";
import { logAudit, getClientIp } from "@/lib/server/audit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  role: z.enum(["user", "admin"]),
});

/**
 * Admin-only: promote/demote a user. Admin identity from the current
 * session. A mismatching UUID → 404 (don't leak existence).
 * Writes an audit_logs row for every role change.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Self-demotion guard — prevent an admin from locking themselves out.
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (id === user.id && parsed.data.role !== "admin") {
    return NextResponse.json(
      { error: "Admins cannot demote themselves. Promote another admin first." },
      { status: 409 },
    );
  }

  const { data: existing } = await adminSupabase
    .from("profiles")
    .select("id, role, email")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await adminSupabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", id)
    .select("id, role, email, display_name, signup_method, updated_at")
    .maybeSingle();

  if (error) {
    logger.error("[admin/users/:id] update failed", { message: error.message });
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }

  logAudit({
    actor: user.id,
    action: "profile.role_changed",
    resourceType: "profile",
    resourceId: id,
    metadata: {
      previous: existing.role,
      next: parsed.data.role,
      target_email: existing.email,
    },
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json(data);
}
