/**
 * Stateless nonce issuance for wallet sign-in.
 *
 * The /api/auth/wallet/nonce route returns a `(nonce, message)` pair where
 * `message` is what the wallet signs and `nonce` is an HMAC-signed token
 * embedded in the message. /api/auth/wallet/verify recomputes the HMAC to
 * confirm the nonce was issued by us and hasn't expired — no server-side
 * storage needed (no DB row, no in-memory cache, no Redis).
 *
 * Format: `<chain>.<address>.<expiresAtMs>.<random>.<hmac>` where hmac is
 * HMAC-SHA256(SESSION_SECRET, the rest), hex, first 32 chars.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getSecret(): string {
  const s = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) {
    throw new Error(
      "SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set for nonce signing",
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 32);
}

/** Build a fresh nonce + the message the wallet should sign. */
export interface IssuedNonce {
  nonce: string;
  message: string;
  expiresAt: string;
}

export function issueNonce(opts: {
  chain: string;
  address: string;
  domain: string;
}): IssuedNonce {
  const { chain, address, domain } = opts;
  const expiresAt = Date.now() + NONCE_TTL_MS;
  const random = randomBytes(8).toString("hex");
  const payload = `${chain}.${address.toLowerCase()}.${expiresAt}.${random}`;
  const hmac = sign(payload);
  const nonce = `${payload}.${hmac}`;
  const expiresIso = new Date(expiresAt).toISOString();
  const message = [
    `${domain} wants you to sign in with your ${chain} wallet:`,
    address,
    "",
    "By signing this message, you authorize sign-in to goBlink. This",
    "request will not trigger any blockchain transaction or cost gas.",
    "",
    `Issued At: ${new Date().toISOString()}`,
    `Expires At: ${expiresIso}`,
    `Nonce: ${nonce}`,
  ].join("\n");
  return { nonce, message, expiresAt: expiresIso };
}

export interface VerifiedNonce {
  chain: string;
  address: string;
  expiresAt: number;
}

/**
 * Pull the nonce out of the signed message and validate it. Returns the
 * decoded fields on success, throws on any failure.
 */
export function verifyMessageNonce(opts: {
  message: string;
  expectedChain: string;
  expectedAddress: string;
}): VerifiedNonce {
  const { message, expectedChain, expectedAddress } = opts;
  const noncePrefix = "Nonce: ";
  const noncePart = message
    .split("\n")
    .find((line) => line.startsWith(noncePrefix));
  if (!noncePart) throw new Error("Nonce missing from message");
  const nonce = noncePart.slice(noncePrefix.length).trim();

  const parts = nonce.split(".");
  if (parts.length !== 5) throw new Error("Malformed nonce");
  const [chain, address, expiresAtStr, random, hmac] = parts;
  const payload = `${chain}.${address}.${expiresAtStr}.${random}`;
  const expectedHmac = sign(payload);

  if (
    hmac.length !== expectedHmac.length ||
    !timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))
  ) {
    throw new Error("Invalid nonce signature");
  }

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    throw new Error("Nonce expired");
  }

  if (chain !== expectedChain) {
    throw new Error("Nonce chain mismatch");
  }
  if (address !== expectedAddress.toLowerCase()) {
    throw new Error("Nonce address mismatch");
  }

  return { chain, address, expiresAt };
}
