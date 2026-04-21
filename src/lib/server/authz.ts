/**
 * Server-side authorization helpers.
 *
 * `profiles.role` is the source of truth for admin access. The column is
 * provisioned by `migrations/002_profiles_role.sql`. Promotions must be
 * made via the Supabase dashboard / CLI — there is no in-app UI for it.
 */

import { adminSupabase } from "@/lib/server/db";
import { logger } from "@/lib/logger";

export type Role = "user" | "admin";

/**
 * Returns the caller's role, or null if the profile row is missing.
 * Uses the service-role client so we can read the column regardless of
 * RLS policies.
 */
export async function getUserRole(userId: string): Promise<Role | null> {
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    logger.warn("[authz] getUserRole failed", {
      userId,
      message: error.message,
    });
    return null;
  }
  if (!data?.role) return null;
  return data.role === "admin" ? "admin" : "user";
}

export async function isAdmin(userId: string): Promise<boolean> {
  return (await getUserRole(userId)) === "admin";
}
