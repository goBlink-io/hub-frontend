"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "goblink-merchant-test-mode";

export function useMerchantTestMode() {
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setIsTestMode(true);
    } catch {
      // SSR or localStorage unavailable
    }
  }, []);

  const setTestMode = useCallback((value: boolean) => {
    setIsTestMode(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  }, []);

  const toggleTestMode = useCallback(() => {
    setTestMode(!isTestMode);
  }, [isTestMode, setTestMode]);

  return { isTestMode, setTestMode, toggleTestMode };
}
