/**
 * Merchant project Supabase helpers.
 *
 * Mirrors `src/lib/book/book-client.ts`. Auth comes from Blink (via the
 * Supabase session cookie); data queries target the Merchant project.
 *
 * merchants.user_id was decoupled from Merchant's local `auth.users(id)`
 * FK in the decouple_merchants_from_local_auth migration. merchants.user_id
 * now stores the Blink UUID directly.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient as createBlinkClient } from "@/lib/supabase/server";
import { getProjectClient } from "@/lib/supabase/projects";
import { logger } from "@/lib/logger";

export interface MerchantContext {
  user: User;
  merchantDb: SupabaseClient;
}

export async function getMerchantContext(): Promise<MerchantContext | null> {
  const blink = await createBlinkClient();
  const {
    data: { user },
  } = await blink.auth.getUser();
  if (!user) return null;
  const merchantDb = getProjectClient("merchant", "admin");
  return { user, merchantDb };
}

export function getMerchantAdminClient(): SupabaseClient {
  return getProjectClient("merchant", "admin");
}

/**
 * Resolve the active merchant row for a Blink user. Most merchant API
 * routes start with this; return null implies "caller hasn't onboarded
 * a merchant yet", which maps to 404.
 */
export async function getMerchantForUser(
  userId: string,
  opts: { isTest?: boolean } = {},
): Promise<{ id: string; user_id: string; suspended_at: string | null } | null> {
  const db = getProjectClient("merchant", "admin");
  const { data, error } = await db
    .from("merchants")
    .select("id, user_id, suspended_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    logger.warn("[merchant] getMerchantForUser failed", {
      userId,
      code: error.code,
      message: error.message,
    });
    return null;
  }
  if (!data) return null;
  if (data.suspended_at && !opts.isTest) {
    logger.warn("[merchant] merchant is suspended", {
      merchantId: data.id,
      suspendedAt: data.suspended_at,
    });
  }
  return data;
}
