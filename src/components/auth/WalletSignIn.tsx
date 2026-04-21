"use client";

import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { ConnectButton } from "@goblink/connect/react";
import { useWalletSignIn } from "@/hooks/useWalletSignIn";

interface WalletSignInProps {
  /** Where to send the user after successful sign-in. Defaults to "/". */
  redirectTo?: string;
}

/**
 * Drop-in replacement for `<ConnectButton />` on auth pages: connects the
 * wallet AND completes the SIWE-style sign-in handshake automatically once
 * a wallet is connected. Renders the connect button + a status row.
 */
export function WalletSignIn({ redirectTo = "/" }: WalletSignInProps) {
  const router = useRouter();
  const { state } = useWalletSignIn({
    autoOnConnect: true,
    onSuccess: () => {
      router.replace(redirectTo);
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <ConnectButton theme="dark" label="Connect Wallet" />
      <StatusRow state={state.status} message={"message" in state ? state.message : null} />
    </div>
  );
}

function StatusRow({
  state,
  message,
}: {
  state: "idle" | "signing" | "verifying" | "error" | "success";
  message: string | null;
}) {
  if (state === "idle") return null;

  const base = "flex items-center gap-2 text-xs px-3 py-1.5";
  const radius = { borderRadius: "var(--radius-sm)" };

  if (state === "signing") {
    return (
      <div
        className={base}
        style={{
          ...radius,
          color: "var(--color-text-secondary)",
          backgroundColor: "var(--color-bg-tertiary)",
        }}
      >
        <Loader2 size={12} className="animate-spin" />
        Approve in wallet…
      </div>
    );
  }
  if (state === "verifying") {
    return (
      <div
        className={base}
        style={{
          ...radius,
          color: "var(--color-text-secondary)",
          backgroundColor: "var(--color-bg-tertiary)",
        }}
      >
        <Loader2 size={12} className="animate-spin" />
        Verifying…
      </div>
    );
  }
  if (state === "success") {
    return (
      <div
        className={base}
        style={{
          ...radius,
          color: "var(--color-success)",
          backgroundColor: "rgba(16, 185, 129, 0.08)",
        }}
      >
        Signed in. Redirecting…
      </div>
    );
  }
  return (
    <div
      className={base}
      style={{
        ...radius,
        color: "var(--color-danger)",
        backgroundColor: "rgba(239, 68, 68, 0.08)",
      }}
    >
      <AlertTriangle size={12} />
      {message ?? "Sign-in failed"}
    </div>
  );
}
