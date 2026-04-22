/**
 * Book project Supabase helpers.
 *
 * Split across two concerns:
 *   - Auth: comes from **Blink** (canonical identity). We call
 *     `createClient()` from `@/lib/supabase/server` to read the user's
 *     Blink session cookie.
 *   - Data: lives on the **Book** project (`bb_*` tables). We use a
 *     service-role client (`getProjectClient('book', 'admin')`) and
 *     enforce ownership explicitly (`.eq('user_id', userId)`) since
 *     RLS policies on Book expect `auth.uid()`, which won't match the
 *     Blink UUID unless the JWT secret is shared across projects (a
 *     dashboard configuration step).
 *
 * `bb_users.id` was decoupled from Book's `auth.users(id)` FK in the
 * decouple_bb_users_from_local_auth migration, so a Blink UUID can be
 * stored as-is. `ensureBookUser()` upserts a minimal row on first
 * write so downstream FKs (bb_spaces.user_id → bb_users.id, etc.) hold.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient as createBlinkClient } from "@/lib/supabase/server";
import { getProjectClient } from "@/lib/supabase/projects";
import { logger } from "@/lib/logger";

export interface BookContext {
  user: User;
  bookDb: SupabaseClient;
}

/**
 * Resolve the current Blink-authenticated user and return a Book-scoped
 * admin client for data queries. Returns null when the caller isn't
 * authenticated — callers should respond with 401.
 */
export async function getBookContext(): Promise<BookContext | null> {
  const blink = await createBlinkClient();
  const {
    data: { user },
  } = await blink.auth.getUser();
  if (!user) return null;
  const bookDb = getProjectClient("book", "admin");
  return { user, bookDb };
}

/**
 * Admin-only Book client for unauthenticated reads (e.g. the public
 * /sites/[slug]/* renderer).
 */
export function getBookAdminClient(): SupabaseClient {
  return getProjectClient("book", "admin");
}

/**
 * Anon Book client — for public reads that should respect RLS (e.g. if we
 * later add public APIs served directly from Book). Today the published
 * renderer uses the admin client with explicit `is_published = true`
 * filters for simplicity, but this helper exists for when RLS is tightened.
 */
export function getBookAnonClient(): SupabaseClient {
  return getProjectClient("book", "anon");
}

/**
 * Upsert a `bb_users` row for the given Blink user. Idempotent — safe to
 * call at the top of any Book write path. Does NOT throw on conflict.
 */
export async function ensureBookUser(user: User): Promise<void> {
  const bookDb = getProjectClient("book", "admin");
  const { error } = await bookDb.from("bb_users").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      name: (user.user_metadata?.display_name as string | undefined) ?? null,
    },
    { onConflict: "id", ignoreDuplicates: false },
  );
  if (error) {
    // Don't fail the request — log and let the downstream FK constraint
    // surface if the user row really is missing.
    logger.warn("[book] ensureBookUser upsert failed", {
      userId: user.id,
      message: error.message,
    });
  }
}
