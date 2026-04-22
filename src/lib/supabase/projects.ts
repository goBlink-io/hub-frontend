/**
 * Multi-project Supabase client factory.
 *
 * The hub talks to three independent Supabase projects, each with its own
 * schema and (historically) its own auth realm:
 *
 *   - blink     — canonical identity (auth.users), swap data, audit, payment links
 *   - merchant  — payment platform (merchants, payments, invoices, …)
 *   - book      — sites/pages/subscriptions (bb_*)
 *
 * Identity is unified on Blink: all three projects share Blink's JWT secret
 * so a Blink-issued JWT validates inside Merchant and Book RLS via auth.uid().
 *
 * Backwards compatibility: when BLINK_* env vars are unset, we fall back to
 * the legacy NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL set so existing call
 * sites in lib/supabase/{client,server,middleware}.ts and lib/server/db.ts
 * keep working without migration.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupaProject = "blink" | "merchant" | "book";

interface ProjectConfig {
  url: string | undefined;
  anonKey: string | undefined;
  serviceRoleKey: string | undefined;
}

function readConfig(project: SupaProject): ProjectConfig {
  if (project === "blink") {
    return {
      url:
        process.env.BLINK_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey:
        process.env.BLINK_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey:
        process.env.BLINK_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  const upper = project.toUpperCase();
  return {
    url: process.env[`${upper}_SUPABASE_URL`],
    anonKey: process.env[`${upper}_SUPABASE_ANON_KEY`],
    serviceRoleKey: process.env[`${upper}_SUPABASE_SERVICE_ROLE_KEY`],
  };
}

const adminClients = new Map<SupaProject, SupabaseClient>();
const anonClients = new Map<SupaProject, SupabaseClient>();

/**
 * Get a Supabase client for a specific project, in either anon (RLS-respecting)
 * or admin (service-role, RLS-bypassing) mode. Cached per (project, mode).
 *
 * Throws if the requested project's env vars aren't configured.
 */
export function getProjectClient(
  project: SupaProject,
  mode: "anon" | "admin",
): SupabaseClient {
  const cache = mode === "admin" ? adminClients : anonClients;
  const cached = cache.get(project);
  if (cached) return cached;

  const cfg = readConfig(project);
  const key = mode === "admin" ? cfg.serviceRoleKey : cfg.anonKey;
  if (!cfg.url) {
    throw new Error(
      `Supabase project "${project}" URL is not configured. Set ${
        project === "blink"
          ? "BLINK_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)"
          : `${project.toUpperCase()}_SUPABASE_URL`
      }.`,
    );
  }
  if (!key) {
    throw new Error(
      `Supabase project "${project}" ${mode} key is not configured.`,
    );
  }

  const client = createClient(cfg.url, key);
  cache.set(project, client);
  return client;
}

/**
 * Resolve the project ref (the `xxxxxxxxxxxxxxxxxxxx` portion of
 * `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`). Used to build the canonical
 * `sb-<ref>-auth-token` cookie name when minting wallet sessions.
 */
export function getProjectRef(project: SupaProject): string {
  const cfg = readConfig(project);
  if (!cfg.url) {
    throw new Error(`Supabase project "${project}" URL is not configured.`);
  }
  const m = cfg.url.match(/^https?:\/\/([^./]+)\./);
  if (!m) {
    throw new Error(
      `Cannot derive project ref from Supabase URL: ${cfg.url}`,
    );
  }
  return m[1];
}
