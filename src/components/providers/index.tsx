"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { BlinkConnectProvider } from "@goblink/connect/react";

const blinkConnectConfig = {
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  appName: "goBlink",
  appDescription: "Cross-Chain Everything",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://goblink.io",
  appIcon: "/favicon.ico",
};

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <BlinkConnectProvider config={blinkConnectConfig}>
        {children}
      </BlinkConnectProvider>
    </ThemeProvider>
  );
}
