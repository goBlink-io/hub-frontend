'use client';

import { useState, useEffect, useCallback } from 'react';

export interface HistoryEntry {
  id: string;
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  depositAddress: string;
  status: string;
  timestamp: number;
}

// TODO(security): Transaction history contains deposit addresses — consider migrating to secureStorage
const STORAGE_KEY = 'goblink_tx_history';
const MAX_ENTRIES = 20;

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* quota exceeded — silently ignore */ }
}

export function useTransactionHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setHistory(prev => {
      const updated = [newEntry, ...prev].slice(0, MAX_ENTRIES);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const updateStatus = useCallback((depositAddress: string, status: string) => {
    setHistory(prev => {
      const updated = prev.map(e =>
        e.depositAddress === depositAddress ? { ...e, status } : e
      );
      saveHistory(updated);
      return updated;
    });
  }, []);

  return { history, addEntry, updateStatus };
}
