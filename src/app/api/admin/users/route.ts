import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";
import { isAdmin } from "@/lib/server/authz";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Admin-only user directory.
 * GET /api/admin/users?q=foo&role=admin&limit=50&offset=0
 * Returns profiles joined with auth.users for email/last-sign-in.
 */
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
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const roleFilter = sp.get("role");

  let query = adminSupabase
    .from("profiles")
    .select(
      "id, role, email, display_name, signup_method, created_at, updated_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (roleFilter === "admin" || roleFilter === "user") {
    query = query.eq("role", roleFilter);
  }
  if (q) {
    query = query.ilike("email", `%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    logger.error("[admin/users] query failed", { message: error.message });
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }

  return NextResponse.json({
    users: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
