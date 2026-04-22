"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "goblink-merchant-test-mode";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

export function useMerchantTestMode() {
  const isTestMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTestMode = useCallback((value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
      // storage event only fires in *other* tabs — dispatch locally so this tab re-reads.
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {
      // ignore
    }
  }, []);

  const toggleTestMode = useCallback(() => {
    setTestMode(!isTestMode);
  }, [isTestMode, setTestMode]);

  return { isTestMode, setTestMode, toggleTestMode };
}
