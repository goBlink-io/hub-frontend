/**
 * DNS verification for Book custom domains.
 *
 * A space owner types their domain into settings and is handed a CNAME
 * target (BOOK_CUSTOM_DOMAIN_CNAME_TARGET). They point their domain at
 * that target and then press "Verify" — this module performs the DNS
 * lookup. If the resolved CNAME (case-insensitive, trailing-dot
 * tolerant) matches the target, the space is marked verified.
 *
 * Uses Node's built-in `dns/promises` — no new deps.
 *
 * Serving gate: the public `/sites/[slug]` handler should require
 * `custom_domain_verified = true` before treating a request's host
 * header as a custom-domain hit.
 */

import { resolveCname, resolve4 } from "node:dns/promises";
import { logger } from "@/lib/logger";

export interface DomainVerifyResult {
  verified: boolean;
  /** Short human-readable reason. Shown back to the owner. */
  reason: string;
  /** What we resolved — useful for debugging a mis-pointed record. */
  observed?: string[];
  /** The configured target at verify-time (so the UI can echo it). */
  expected?: string;
}

/**
 * Normalise a hostname for comparison: lowercase, strip the trailing
 * dot that some resolvers attach to absolute names.
 */
function norm(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

export async function verifyCustomDomain(domain: string): Promise<DomainVerifyResult> {
  const target = process.env.BOOK_CUSTOM_DOMAIN_CNAME_TARGET;
  if (!target) {
    return {
      verified: false,
      reason: "BOOK_CUSTOM_DOMAIN_CNAME_TARGET not configured on the server",
    };
  }
  const expected = norm(target);

  // 1) Try CNAME — the preferred setup. Some TLDs / DNS providers don't
  //    let you CNAME an apex, so we fall back to A-record matching against
  //    the target's own A records.
  try {
    const cnames = await resolveCname(domain);
    const normalized = cnames.map(norm);
    if (normalized.includes(expected)) {
      return {
        verified: true,
        reason: "CNAME matches configured target",
        observed: cnames,
        expected,
      };
    }
    // CNAME exists but points elsewhere — fall through to the A-record
    // branch in case the user deliberately chose apex + A records.
    logger.info("[verify-domain] CNAME mismatch", {
      domain,
      observed: normalized,
      expected,
    });
  } catch (err) {
    // ENODATA / ENOTFOUND is expected when the apex has no CNAME — don't
    // log those at warn level.
    const code = (err as NodeJS.ErrnoException)?.code ?? "";
    if (code && code !== "ENODATA" && code !== "ENOTFOUND") {
      logger.warn("[verify-domain] CNAME lookup failed", {
        domain,
        code,
      });
    }
  }

  // 2) A-record fallback: compare resolved IPs of `domain` against
  //    resolved IPs of the target. Matching a subset is enough — CDNs
  //    rotate IPs and we don't want false negatives because the user's
  //    resolver happened to return a different RR.
  try {
    const [domainIps, targetIps] = await Promise.all([
      resolve4(domain).catch(() => []),
      resolve4(target).catch(() => []),
    ]);
    if (domainIps.length === 0) {
      return {
        verified: false,
        reason: "no DNS records found — point a CNAME at the target and try again",
        expected,
      };
    }
    if (targetIps.length === 0) {
      // Can't compare without target IPs; surface as inconclusive and
      // return `verified: false` — owner retries later.
      return {
        verified: false,
        reason: "server could not resolve the target A records — try again shortly",
        observed: domainIps,
        expected,
      };
    }
    const targetSet = new Set(targetIps);
    const match = domainIps.some((ip) => targetSet.has(ip));
    if (match) {
      return {
        verified: true,
        reason: "A record matches target IPs",
        observed: domainIps,
        expected,
      };
    }
    return {
      verified: false,
      reason: `records resolve to ${domainIps.join(", ")} which does not match ${target}`,
      observed: domainIps,
      expected,
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code ?? "";
    return {
      verified: false,
      reason: `DNS lookup failed (${code || "unknown error"})`,
      expected,
    };
  }
}
