'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'goblink_patterns';
const MAX_ROUTES = 50;

interface RouteEntry {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  count: number;
  lastUsed: number;
}

export interface UserPattern {
  routes: RouteEntry[];
  favoriteChains: string[]; // derived from routes, sorted by frequency
  totalTransfers: number;
  firstTransferAt: number;
  lastTransferAt: number;
}

const DEFAULT_PATTERN: UserPattern = {
  routes: [],
  favoriteChains: [],
  totalTransfers: 0,
  firstTransferAt: 0,
  lastTransferAt: 0,
};

function loadPattern(): UserPattern {
  if (typeof window === 'undefined') return DEFAULT_PATTERN;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PATTERN;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PATTERN, ...parsed };
  } catch {
    return DEFAULT_PATTERN;
  }
}

function deriveChains(routes: RouteEntry[]): string[] {
  const freq: Record<string, number> = {};
  for (const r of routes) {
    freq[r.fromChain] = (freq[r.fromChain] || 0) + r.count;
    freq[r.toChain] = (freq[r.toChain] || 0) + r.count;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([chain]) => chain);
}

function savePattern(pattern: UserPattern) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pattern));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function useSmartDefaults() {
  const [pattern, setPattern] = useState<UserPattern>(DEFAULT_PATTERN);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPattern(loadPattern());
    setHydrated(true);
  }, []);

  /**
   * Record a completed route. Call after each successful transfer.
   */
  const recordRoute = useCallback(
    (fromChain: string, toChain: string, fromToken: string, toToken: string) => {
      setPattern(prev => {
        const now = Date.now();
        const routes = [...prev.routes];

        const existing = routes.find(
          r =>
            r.fromChain === fromChain &&
            r.toChain === toChain &&
            r.fromToken === fromToken &&
            r.toToken === toToken
        );

        if (existing) {
          existing.count += 1;
          existing.lastUsed = now;
        } else {
          routes.push({ fromChain, toChain, fromToken, toToken, count: 1, lastUsed: now });
        }

        // Trim to MAX_ROUTES by removing least-recently-used
        if (routes.length > MAX_ROUTES) {
          routes.sort((a, b) => b.lastUsed - a.lastUsed);
          routes.splice(MAX_ROUTES);
        }

        const updated: UserPattern = {
          routes,
          favoriteChains: deriveChains(routes),
          totalTransfers: prev.totalTransfers + 1,
          firstTransferAt: prev.firstTransferAt || now,
          lastTransferAt: now,
        };

        savePattern(updated);
        return updated;
      });
    },
    []
  );

  /**
   * Returns the single most-used route for pre-filling SwapForm.
   */
  const getSuggestedRoute = useCallback((): RouteEntry | null => {
    if (pattern.routes.length === 0) return null;
    return [...pattern.routes].sort((a, b) => b.count - a.count)[0] ?? null;
  }, [pattern.routes]);

  /**
   * Returns up to 3 chains the user interacts with most frequently.
   */
  const getFrequentChains = useCallback((): string[] => {
    return pattern.favoriteChains.slice(0, 3);
  }, [pattern.favoriteChains]);

  /**
   * Returns aggregate stats about the user's transfer history.
   */
  const getStats = useCallback(() => {
    const daysSinceFirst =
      pattern.firstTransferAt > 0
        ? Math.floor((Date.now() - pattern.firstTransferAt) / 86_400_000)
        : 0;
    return {
      totalTransfers: pattern.totalTransfers,
      daysSinceFirst,
      firstTransferAt: pattern.firstTransferAt,
      lastTransferAt: pattern.lastTransferAt,
    };
  }, [pattern]);

  /**
   * True once localStorage has been read (avoids SSR mismatch).
   */
  const isHydrated = hydrated;

  return {
    pattern,
    isHydrated,
    recordRoute,
    getSuggestedRoute,
    getFrequentChains,
    getStats,
  };
}
