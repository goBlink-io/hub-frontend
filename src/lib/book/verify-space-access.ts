import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verify that a user has access to a space (owner or accepted team member).
 * Returns the user's role: 'owner' | team role, or null if no access.
 */
export async function verifySpaceAccess(
  supabase: SupabaseClient,
  spaceId: string,
  userId: string,
): Promise<"owner" | "admin" | "editor" | "viewer" | null> {
  const { data: space } = await supabase
    .from("bb_spaces")
    .select("id")
    .eq("id", spaceId)
    .eq("user_id", userId)
    .single();

  if (space) return "owner";

  const { data: member } = await supabase
    .from("bb_team_members")
    .select("role")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .single();

  if (member) return member.role as "admin" | "editor" | "viewer";

  return null;
}
