import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client — bypasses RLS. Use ONLY for:
 * - Admin routes (admin/*)
 * - Server-side operations that need cross-user access (transaction search, audit logs)
 * - Cron jobs and background tasks
 */
let _adminSupabase: SupabaseClient | null = null;

export const adminSupabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_adminSupabase) {
      _adminSupabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
    }
    return (_adminSupabase as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Anon-key client — respects RLS policies. Use for:
 * - Public-facing queries (payment link status, route stats, features)
 * - Any route where user input determines the query scope
 */
let _anonSupabase: SupabaseClient | null = null;

export const anonSupabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_anonSupabase) {
      _anonSupabase = createClient(
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    }
    return (_anonSupabase as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** @deprecated Use adminSupabase or anonSupabase explicitly */
export const supabase = adminSupabase;
