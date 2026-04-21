/**
 * Paywall resolution for the public book site renderer.
 *
 * Given a (space_id, page_id) and a visitor's attached wallets, resolves
 * the visitor's access to the page:
 *
 *   - PageGate:   any bb_access_rules or bb_paid_content associated with
 *                 the specific page
 *   - SpaceGate:  space-wide rules/content (page_id = null)
 *
 * A page is "accessible" if:
 *   - No active gates apply, OR
 *   - Any token-gate rule is satisfied by the visitor's wallets, OR
 *   - Any purchase record exists for the visitor's wallet matching an
 *     active paid-content row
 *
 * Token-gate balance checks run via `lib/book/wallet-balance.ts` which
 * reuses the hub's RPC config per chain.
 */

import { getBookAdminClient } from "./book-client";
import { checkWalletHolds } from "./wallet-balance";

export interface AccessRule {
  id: string;
  space_id: string;
  page_id: string | null;
  chain: string;
  contract_address: string;
  token_type: string;
  min_amount: string;
  token_id: string | null;
  is_active: boolean;
}

export interface PaidContent {
  id: string;
  space_id: string;
  page_id: string | null;
  price_usd: string | number;
  accepted_tokens: Array<{
    chain: string;
    symbol: string;
    contract_address?: string;
    decimals?: number;
  }>;
  is_active: boolean;
}

export interface WalletClaim {
  chain: string;
  address: string;
}

export interface Verdict {
  gated: boolean;
  granted: boolean;
  reason:
    | "ungated"
    | "token-gate-satisfied"
    | "purchase-record"
    | "token-gate-required"
    | "purchase-required"
    | "unknown-visitor";
  rules: AccessRule[];
  paidContent: PaidContent[];
}

/** Load active rules + paid_content that apply to a given (space, page). */
async function loadApplicable(
  spaceId: string,
  pageId: string,
): Promise<{ rules: AccessRule[]; paidContent: PaidContent[] }> {
  const db = getBookAdminClient();
  const [{ data: rules }, { data: paid }] = await Promise.all([
    db
      .from("bb_access_rules")
      .select("*")
      .eq("space_id", spaceId)
      .eq("is_active", true),
    db
      .from("bb_paid_content")
      .select("*")
      .eq("space_id", spaceId)
      .eq("is_active", true),
  ]);

  const applicable = (row: { page_id: string | null }) =>
    row.page_id === null || row.page_id === pageId;

  return {
    rules: (rules ?? []).filter(applicable) as AccessRule[],
    paidContent: (paid ?? []).filter(applicable) as PaidContent[],
  };
}

/** Resolve access for a visitor. `wallets` is the list they've signed in with
 *  (empty = anonymous visitor). */
export async function resolveAccess(
  spaceId: string,
  pageId: string,
  wallets: WalletClaim[],
): Promise<Verdict> {
  const { rules, paidContent } = await loadApplicable(spaceId, pageId);

  if (rules.length === 0 && paidContent.length === 0) {
    return {
      gated: false,
      granted: true,
      reason: "ungated",
      rules: [],
      paidContent: [],
    };
  }

  // If no wallets connected, the visitor can't satisfy either gate.
  if (wallets.length === 0) {
    return {
      gated: true,
      granted: false,
      reason: rules.length > 0 ? "token-gate-required" : "purchase-required",
      rules,
      paidContent,
    };
  }

  // Token gate: any active rule satisfied by any attached wallet grants access.
  if (rules.length > 0) {
    for (const rule of rules) {
      const matchingWallets = wallets.filter((w) => w.chain === rule.chain);
      for (const w of matchingWallets) {
        try {
          const holds = await checkWalletHolds({
            chain: rule.chain,
            address: w.address,
            tokenType: rule.token_type,
            contractAddress: rule.contract_address,
            minAmount: rule.min_amount,
            tokenId: rule.token_id,
          });
          if (holds) {
            return {
              gated: true,
              granted: true,
              reason: "token-gate-satisfied",
              rules,
              paidContent,
            };
          }
        } catch {
          // Swallow — treat as not-satisfied. A fail-open verdict could
          // leak premium content on RPC outages.
        }
      }
    }
  }

  // Paid-content gate: visitor must have a confirmed purchase matching
  // any applicable paid_content row.
  if (paidContent.length > 0) {
    const db = getBookAdminClient();
    const addrs = wallets.map((w) => w.address);
    const { data: purchases } = await db
      .from("bb_purchases")
      .select("paid_content_id, buyer_wallet, status")
      .in("paid_content_id", paidContent.map((pc) => pc.id))
      .in("buyer_wallet", addrs)
      .eq("status", "confirmed");
    if ((purchases ?? []).length > 0) {
      return {
        gated: true,
        granted: true,
        reason: "purchase-record",
        rules,
        paidContent,
      };
    }
  }

  return {
    gated: true,
    granted: false,
    reason: rules.length > 0 ? "token-gate-required" : "purchase-required",
    rules,
    paidContent,
  };
}
