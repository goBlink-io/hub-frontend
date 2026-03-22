import type { FeeTier } from '@/lib/shared';

// ─── Configuration ───────────────────────────────────────────────────────────

const DEFAULT_FEE_BPS = parseInt(process.env.APP_FEE_BPS || '35', 10);

/**
 * Fee tiers (sorted ascending by maxAmountUsd).
 * Pure tiered pricing — no minimum fee floor.
 *   < $5,000    → 0.35% (35 bps)
 *   $5K–$50K    → 0.10% (10 bps)
 *   > $50,000   → 0.05% (5 bps)
 */
const DEFAULT_TIERS: FeeTier[] = [
  { maxAmountUsd: 5000, bps: 35 },
  { maxAmountUsd: 50000, bps: 10 },
  { maxAmountUsd: null, bps: 5 },
];

let feeTiers: FeeTier[] = DEFAULT_TIERS;
try {
  if (process.env.FEE_TIERS) {
    feeTiers = JSON.parse(process.env.FEE_TIERS);
  }
} catch {
  console.error('Error parsing FEE_TIERS environment variable, using defaults');
}

// ─── Exports ─────────────────────────────────────────────────────────────────

/**
 * Calculate the fee in basis points for a given USD amount.
 * Falls back to DEFAULT_FEE_BPS if no USD estimate is available.
 */
export const calculateFeeBps = (amountUsd?: number): number => {
  if (amountUsd === undefined || amountUsd <= 0) {
    return DEFAULT_FEE_BPS;
  }
  const tier = feeTiers.find(t => t.maxAmountUsd === null || amountUsd <= t.maxAmountUsd);
  return tier ? tier.bps : DEFAULT_FEE_BPS;
};

/**
 * Calculate the effective fee bps for a given amount.
 * Pure tiered pricing — the tier rate is the rate. No minimums, no caps.
 *
 * Examples:
 *   $1 transfer   → 35 bps (0.35%) = $0.0035
 *   $100 transfer → 35 bps (0.35%) = $0.35
 *   $1K transfer  → 35 bps (0.35%) = $3.50
 *   $5K transfer  → 10 bps (0.10%) = $5.00
 *   $50K transfer → 5 bps (0.05%)  = $25.00
 */
export const calculateEffectiveFeeBps = (amountUsd?: number): number => {
  return calculateFeeBps(amountUsd);
};

/**
 * Get fee tier info for display (used by frontend).
 */
export const getFeeTiers = (): FeeTier[] => feeTiers;

export const getFeeRecipient = (): string => {
  return process.env.APP_FEE_RECIPIENT || 'goblink.near';
};
