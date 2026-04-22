import { NextResponse } from "next/server";
import {
  ensureBookUser,
  getBookAdminClient,
  getBookContext,
} from "@/lib/book/book-client";

/**
 * Invite-acceptance endpoint.
 *
 * GET: returns the invitation's space info for the UI to display
 *      ("You've been invited to SPACE as ROLE") without requiring
 *      an authenticated user (so the invited person can view the
 *      invite page before signing in).
 *
 * POST: accepts the invite. Requires the current user to be signed in
 *       AND the user's email to match the invite's email (case-
 *       insensitive). Binds `user_id`, flips status to 'accepted'.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const bookDb = getBookAdminClient();

  const { data } = await bookDb
    .from("bb_team_members")
    .select("id, space_id, email, role, status, invited_at, accepted_at")
    .eq("invite_token", token)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (data.status === "accepted") {
    return NextResponse.json({ ...data, space: null, alreadyAccepted: true });
  }

  const { data: space } = await bookDb
    .from("bb_spaces")
    .select("id, name, slug")
    .eq("id", data.space_id)
    .maybeSingle();

  return NextResponse.json({
    id: data.id,
    email: data.email,
    role: data.role,
    status: data.status,
    invited_at: data.invited_at,
    space,
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: invite } = await ctx.bookDb
    .from("bb_team_members")
    .select("id, space_id, email, role, status")
    .eq("invite_token", token)
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invite.status === "accepted") {
    return NextResponse.json(
      { error: "Invite already accepted" },
      { status: 409 },
    );
  }

  const callerEmail = (ctx.user.email ?? "").toLowerCase();
  if (callerEmail && callerEmail !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: "This invite is for a different email" },
      { status: 403 },
    );
  }

  // Invited wallet-only user — they don't have an email on auth.users.
  // We still allow acceptance; the email in the invite becomes their
  // recorded email in bb_users if they don't already have one.
  await ensureBookUser(ctx.user);
  if (!callerEmail) {
    await ctx.bookDb
      .from("bb_users")
      .update({ email: invite.email })
      .eq("id", ctx.user.id)
      .is("email", null);
  }

  const { data, error } = await ctx.bookDb
    .from("bb_team_members")
    .update({
      user_id: ctx.user.id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
      // One-time token — null it out on accept to prevent reuse.
      invite_token: null,
    })
    .eq("id", invite.id)
    .select("id, space_id, role, status")
    .maybeSingle();

  if (error) {
    console.error("[invite-accept]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}
