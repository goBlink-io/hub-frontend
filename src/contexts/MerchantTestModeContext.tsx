"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useMerchantTestMode } from "@/hooks/useMerchantTestMode";

interface TestModeContextValue {
  isTestMode: boolean;
  setTestMode: (value: boolean) => void;
  toggleTestMode: () => void;
}

const MerchantTestModeContext = createContext<TestModeContextValue>({
  isTestMode: false,
  setTestMode: () => {},
  toggleTestMode: () => {},
});

export function MerchantTestModeProvider({ children }: { children: ReactNode }) {
  const testMode = useMerchantTestMode();
  return (
    <MerchantTestModeContext.Provider value={testMode}>
      {children}
    </MerchantTestModeContext.Provider>
  );
}

export function useMerchantTestModeContext() {
  return useContext(MerchantTestModeContext);
}
