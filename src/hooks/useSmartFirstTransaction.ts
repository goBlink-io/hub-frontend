'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TransferRecord {
  timestamp: number;
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  amountUsd: number;
  success: boolean;
}

export type NudgeType =
  | 'first-ever'        // Never used goBlink before
  | 'first-chain'       // First time using this chain pair
  | 'first-large'       // Biggest transfer yet (by significant margin)
  | 'welcome-back'      // Returning after 7+ days
  | null;               // No nudge needed

export interface Nudge {
  type: NudgeType;
  message: string;
  suggestion?: string;  // Suggested small test amount
  dismissable: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'goblink_transfer_records';
const MAX_RECORDS = 100;
const LARGE_THRESHOLD_MULTIPLIER = 3; // 3x their previous max = "large"
const WELCOME_BACK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Persistence ────────────────────────────────────────────────────────────────

function loadRecords(): TransferRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: TransferRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch { /* quota — silently ignore */ }
}

// ── Suggested test amounts per token type ──────────────────────────────────────

const TEST_AMOUNTS: Record<string, string> = {
  ETH: '0.002',
  WETH: '0.002',
  SOL: '0.05',
  NEAR: '1',
  SUI: '0.5',
  USDC: '5',
  USDT: '5',
  DAI: '5',
  BNB: '0.01',
  MATIC: '2',
  APT: '0.5',
  default: '5',
};

function getSuggestedAmount(tokenSymbol: string): string {
  return TEST_AMOUNTS[tokenSymbol] || TEST_AMOUNTS.default;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useSmartFirstTransaction(
  fromChain: string,
  toChain: string,
  fromToken: string,
  amountUsd: number,
) {
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [dismissed, setDismissed] = useState(false);

  // Load on mount
  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  // Reset dismissed state when chain/token changes
  useEffect(() => {
    setDismissed(false);
  }, [fromChain, toChain, fromToken]);

  // ── Detection logic ────────────────────────────────────────────────────────

  const nudge: Nudge | null = useMemo(() => {
    if (dismissed) return null;

    const successfulRecords = records.filter(r => r.success);

    // 1. First ever swap
    if (successfulRecords.length === 0) {
      return {
        type: 'first-ever',
        message: "Welcome to goBlink! We recommend starting with a small test transfer to see how fast it is.",
        suggestion: getSuggestedAmount(fromToken),
        dismissable: true,
      };
    }

    // 2. Welcome back (7+ days since last transfer)
    const lastTransfer = Math.max(...successfulRecords.map(r => r.timestamp));
    if (Date.now() - lastTransfer > WELCOME_BACK_MS) {
      return {
        type: 'welcome-back',
        message: "Welcome back! It's been a while — consider a quick test transfer to warm up.",
        suggestion: getSuggestedAmount(fromToken),
        dismissable: true,
      };
    }

    // 3. First time on this chain pair
    const hasChainPair = successfulRecords.some(
      r => r.fromChain === fromChain && r.toChain === toChain
    );
    if (!hasChainPair) {
      const chainName = toChain.charAt(0).toUpperCase() + toChain.slice(1);
      return {
        type: 'first-chain',
        message: `First transfer to ${chainName}? Try a small amount first — it'll arrive in seconds.`,
        suggestion: getSuggestedAmount(fromToken),
        dismissable: true,
      };
    }

    // 4. Unusually large amount
    if (amountUsd > 0) {
      const prevMaxUsd = Math.max(...successfulRecords.map(r => r.amountUsd), 0);
      if (prevMaxUsd > 0 && amountUsd > prevMaxUsd * LARGE_THRESHOLD_MULTIPLIER && amountUsd > 100) {
        return {
          type: 'first-large',
          message: `This is ${Math.round(amountUsd / prevMaxUsd)}× your usual transfer. Want to test with a smaller amount first?`,
          suggestion: getSuggestedAmount(fromToken),
          dismissable: true,
        };
      }
    }

    return null;
  }, [records, fromChain, toChain, fromToken, amountUsd, dismissed]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const recordTransfer = useCallback((transfer: Omit<TransferRecord, 'timestamp'>) => {
    setRecords(prev => {
      const updated = [{ ...transfer, timestamp: Date.now() }, ...prev].slice(0, MAX_RECORDS);
      saveRecords(updated);
      return updated;
    });
  }, []);

  /** Update the most recent record's success status (call when terminal status confirmed) */
  const updateLastRecordSuccess = useCallback((success: boolean) => {
    setRecords(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[0] = { ...updated[0], success };
      saveRecords(updated);
      return updated;
    });
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  const stats = useMemo(() => {
    const successful = records.filter(r => r.success);
    return {
      totalTransfers: successful.length,
      uniqueChainPairs: new Set(successful.map(r => `${r.fromChain}-${r.toChain}`)).size,
      totalVolumeUsd: successful.reduce((sum, r) => sum + r.amountUsd, 0),
    };
  }, [records]);

  return { nudge, dismiss, recordTransfer, updateLastRecordSuccess, stats };
}
