import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { enforceLimit, getRequiredPlan } from "@/lib/book/check-plan";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

/**
 * Team management for a space.
 *
 * GET: list members (owner, admin, editor, viewer). Any role with
 *      access can list.
 * POST: invite a new member by email. Owner or admin only. Generates
 *       an invite_token the inviter can share (email delivery is a
 *       separate TODO — see Phase 3).
 */

const inviteSchema = z.object({
  email: z.string().email().max(200),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Include the owner row in the response so UIs don't have to stitch
  // two tables together. bb_spaces.user_id holds the owner.
  const [ownerRes, membersRes] = await Promise.all([
    ctx.bookDb
      .from("bb_spaces")
      .select("user_id, bb_users!inner(id, email, name)")
      .eq("id", id)
      .maybeSingle(),
    ctx.bookDb
      .from("bb_team_members")
      .select("id, user_id, email, role, status, invited_at, accepted_at")
      .eq("space_id", id)
      .order("invited_at", { ascending: false }),
  ]);

  if (membersRes.error) {
    console.error("[team-get]", membersRes.error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({
    owner: ownerRes.data
      ? {
          user_id: ownerRes.data.user_id,
          email:
            (ownerRes.data.bb_users as { email?: string } | null)?.email ?? null,
          name:
            (ownerRes.data.bb_users as { name?: string } | null)?.name ?? null,
        }
      : null,
    members: membersRes.data ?? [],
  });
}

export async function POST(
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

  // Find the space's owner for the plan check (owner pays for team size).
  const { data: space } = await ctx.bookDb
    .from("bb_spaces")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canInvite = await enforceLimit(space.user_id, "team", id);
  if (!canInvite) {
    return NextResponse.json(
      { error: "upgrade_required", plan: getRequiredPlan("team") },
      { status: 402 },
    );
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const { data: existing } = await ctx.bookDb
    .from("bb_team_members")
    .select("id, status")
    .eq("space_id", id)
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "This email is already invited or accepted" },
      { status: 409 },
    );
  }

  const inviteToken = nanoid(32);
  const { data, error } = await ctx.bookDb
    .from("bb_team_members")
    .insert({
      space_id: id,
      email,
      role: parsed.data.role,
      status: "pending",
      invite_token: inviteToken,
    })
    .select("id, email, role, status, invite_token, invited_at")
    .maybeSingle();

  if (error) {
    console.error("[team-post]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
