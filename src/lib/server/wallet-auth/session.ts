/**
 * Wallet → Supabase session bridge.
 *
 * After verifyWalletSignature succeeds, this module:
 *   1. Looks up `linked_wallets` by (chain, address) on Blink
 *   2. If miss: creates an auth.users row via service-role admin API,
 *      inserts profiles + linked_wallets, marks signup_method='wallet'
 *   3. Mints a Supabase-compatible JWT (HS256, signed with Blink's JWT
 *      secret) so existing `supabase.auth.getUser()` call sites work
 *      transparently for wallet-authenticated users
 *   4. Sets the session cookie in the canonical Supabase format
 *      (`sb-<project-ref>-auth-token`) so middleware reads it correctly
 *
 * This keeps every existing API route's auth check (`supabase.auth.getUser()`)
 * agnostic to whether the user signed in via wallet, email, or OAuth.
 */

import { SignJWT } from "jose";
import { cookies } from "next/headers";
import {
  getProjectClient,
  getProjectRef,
  type SupaProject,
} from "@/lib/supabase/projects";
import { logger } from "@/lib/logger";
import type { ChainType, WalletVerifyResponse } from "./types";

const ACCESS_TOKEN_TTL_SEC = 60 * 60; // 1 hour
const REFRESH_TOKEN_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

interface MintInput {
  chain: ChainType;
  address: string;
  walletName?: string;
}

export class WalletSessionError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code = "wallet_session_failed", status = 500) {
    super(message);
    this.name = "WalletSessionError";
    this.code = code;
    this.status = status;
  }
}

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.BLINK_SUPABASE_JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new WalletSessionError(
      "BLINK_SUPABASE_JWT_SECRET (or SUPABASE_JWT_SECRET) must be set to mint wallet sessions.",
      "jwt_secret_unconfigured",
      503,
    );
  }
  return new TextEncoder().encode(secret);
}

/** Lookup the existing wallet ↔ user binding on Blink, or create one. */
async function lookupOrCreateUser(
  input: MintInput,
): Promise<{ userId: string; walletId: string; isNewUser: boolean }> {
  const blink = getProjectClient("blink", "admin");
  const chain = input.chain;
  const address = input.address;

  // 1) Existing wallet?
  const { data: existing, error: lookupErr } = await blink
    .from("linked_wallets")
    .select("id, user_id")
    .eq("chain", chain)
    .eq("address", address)
    .maybeSingle();
  if (lookupErr) {
    logger.error("[wallet-session] linked_wallets lookup failed", {
      message: lookupErr.message,
    });
    throw new WalletSessionError(
      "Wallet lookup failed",
      "lookup_failed",
      500,
    );
  }
  if (existing?.user_id) {
    // Stamp last sign-in time, fire-and-forget.
    void blink
      .from("linked_wallets")
      .update({ last_signed_in_at: new Date().toISOString() })
      .eq("id", existing.id);
    return { userId: existing.user_id, walletId: existing.id, isNewUser: false };
  }

  // 2) Create the auth.users row. We provide no email — wallet users may
  //    never give one — and tag signup_method in app_metadata so the
  //    profiles trigger picks it up on insert.
  const { data: created, error: createErr } = await blink.auth.admin.createUser({
    email: undefined,
    email_confirm: true,
    app_metadata: {
      provider: "wallet",
      signup_method: "wallet",
    },
    user_metadata: {
      primary_chain: chain,
      primary_address: address,
    },
  });
  if (createErr || !created?.user) {
    logger.error("[wallet-session] auth.admin.createUser failed", {
      message: createErr?.message,
    });
    throw new WalletSessionError(
      "Failed to create wallet user",
      "user_create_failed",
      500,
    );
  }
  const userId = created.user.id;

  // 3) Insert linked_wallets. Race window is small but possible if the same
  //    address signs twice within milliseconds — handle the unique violation
  //    by re-querying and adopting the existing row.
  const insertWallet = await blink
    .from("linked_wallets")
    .insert({
      user_id: userId,
      chain,
      address,
      last_signed_in_at: new Date().toISOString(),
      metadata: input.walletName ? { walletName: input.walletName } : {},
    })
    .select("id")
    .maybeSingle();
  if (insertWallet.error) {
    // Race: another request just inserted the same (chain, address). Roll
    // back the orphan auth.users row and adopt the winning user.
    const { data: winner } = await blink
      .from("linked_wallets")
      .select("id, user_id")
      .eq("chain", chain)
      .eq("address", address)
      .maybeSingle();
    if (winner?.user_id) {
      await blink.auth.admin.deleteUser(userId).catch((err) => {
        logger.warn("[wallet-session] orphan user cleanup failed", {
          userId,
          err: String(err),
        });
      });
      return {
        userId: winner.user_id,
        walletId: winner.id,
        isNewUser: false,
      };
    }
    logger.error("[wallet-session] linked_wallets insert failed", {
      message: insertWallet.error.message,
    });
    throw new WalletSessionError(
      "Failed to link wallet",
      "wallet_link_failed",
      500,
    );
  }

  return { userId, walletId: insertWallet.data!.id, isNewUser: true };
}

interface MintedTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}

/**
 * Mint a Supabase-compatible HS256 JWT that `supabase.auth.getUser()` will
 * accept as a valid session.
 */
async function mintSession(opts: {
  userId: string;
  chain: ChainType;
  address: string;
  role: "user" | "admin";
}): Promise<MintedTokens> {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const accessExpiresAt = now + ACCESS_TOKEN_TTL_SEC;
  const refreshExpiresAt = now + REFRESH_TOKEN_TTL_SEC;

  const accessToken = await new SignJWT({
    aud: "authenticated",
    role: "authenticated",
    sub: opts.userId,
    email: "",
    phone: "",
    app_metadata: {
      provider: "wallet",
      providers: ["wallet"],
      role: opts.role,
    },
    user_metadata: {
      primary_chain: opts.chain,
      primary_address: opts.address,
    },
    session_id: cryptoRandomUuid(),
    is_anonymous: false,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(accessExpiresAt)
    .sign(secret);

  // We don't implement refresh-token rotation in v1: the refresh token is
  // an opaque random string the cookie format requires but we never accept
  // it for refresh. When the access token expires the user re-signs.
  const refreshToken = cryptoRandomUuid().replace(/-/g, "");

  return { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt };
}

function cryptoRandomUuid(): string {
  // Node 18+ + Web Crypto on edge runtimes.
  return crypto.randomUUID();
}

/**
 * Set the canonical Supabase session cookie so the rest of the codebase's
 * `createServerClient(...).auth.getUser()` calls read the session correctly.
 *
 * Cookie name: `sb-<project-ref>-auth-token`
 * Cookie body: JSON-encoded array per `@supabase/ssr` convention
 */
async function writeSessionCookie(opts: {
  project: SupaProject;
  userId: string;
  tokens: MintedTokens;
}) {
  const ref = getProjectRef(opts.project);
  const cookieName = `sb-${ref}-auth-token`;
  const value = JSON.stringify({
    access_token: opts.tokens.accessToken,
    token_type: "bearer",
    expires_in: ACCESS_TOKEN_TTL_SEC,
    expires_at: opts.tokens.accessExpiresAt,
    refresh_token: opts.tokens.refreshToken,
    user: {
      id: opts.userId,
      aud: "authenticated",
      role: "authenticated",
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(cookieName, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SEC,
  });
}

/**
 * End-to-end wallet sign-in: lookup-or-create user, mint session, write
 * cookie. Returns identifying info for the response body.
 */
export async function signInWithWallet(input: MintInput): Promise<WalletVerifyResponse> {
  const { userId, walletId, isNewUser } = await lookupOrCreateUser(input);

  // Resolve role from profiles for the access-token claim.
  const blink = getProjectClient("blink", "admin");
  const { data: profile } = await blink
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const role = profile?.role === "admin" ? "admin" : "user";

  const tokens = await mintSession({
    userId,
    chain: input.chain,
    address: input.address,
    role,
  });
  await writeSessionCookie({ project: "blink", userId, tokens });

  return {
    userId,
    walletId,
    chain: input.chain,
    address: input.address,
    isNewUser,
  };
}

/** Clear the session cookie. */
export async function signOut(project: SupaProject = "blink"): Promise<void> {
  const ref = getProjectRef(project);
  const cookieStore = await cookies();
  cookieStore.delete(`sb-${ref}-auth-token`);
}
