"use client";

import { FlaskConical } from "lucide-react";
import { useMerchantTestModeContext } from "@/contexts/MerchantTestModeContext";

export function TestModeBar() {
  const { isTestMode } = useMerchantTestModeContext();

  if (!isTestMode) return null;

  return (
    <div
      className="sticky top-0 z-30 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
      style={{
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
        color: "var(--color-warning)",
      }}
    >
      <FlaskConical className="h-4 w-4" />
      Test Mode — Data shown is from test API keys
    </div>
  );
}
