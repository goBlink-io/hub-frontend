"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSign, useWallet } from "@goblink/connect/react";

export type WalletSignInState =
  | { status: "idle" }
  | { status: "signing" }
  | { status: "verifying" }
  | { status: "error"; message: string }
  | { status: "success"; userId: string; isNewUser: boolean };

interface UseWalletSignInOptions {
  /**
   * Auto-trigger sign-in as soon as a wallet connects. Defaults to true.
   * Set false to require an explicit `signIn()` call (e.g. user clicks a
   * "Sign in" button after connecting).
   */
  autoOnConnect?: boolean;
  onSuccess?: (info: { userId: string; isNewUser: boolean }) => void;
}

/**
 * Wraps the wallet sign-in handshake:
 *   1. POST /api/auth/wallet/nonce → server returns `(nonce, message)`
 *   2. blinkconnect.signMessage(message) → wallet signature
 *   3. POST /api/auth/wallet/verify → server verifies + sets session cookie
 *   4. Re-fetch user, fire onSuccess
 *
 * Idempotent per wallet address: re-running on the same connected wallet
 * skips redundant network calls.
 */
export function useWalletSignIn(opts: UseWalletSignInOptions = {}) {
  const { autoOnConnect = true, onSuccess } = opts;
  const { wallets, isConnected } = useWallet();
  const { signMessage } = useSign();
  const [state, setState] = useState<WalletSignInState>({ status: "idle" });
  const signedAddressRef = useRef<string | null>(null);

  const primary = wallets[0] ?? null;

  const signIn = useCallback(async () => {
    if (!primary) {
      setState({ status: "error", message: "Connect a wallet first." });
      return;
    }
    if (signedAddressRef.current === primary.address) return;

    try {
      setState({ status: "signing" });

      const nonceRes = await fetch("/api/auth/wallet/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: primary.chain,
          address: primary.address,
        }),
      });
      if (!nonceRes.ok) {
        const body = (await nonceRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `Nonce request failed (${nonceRes.status})`);
      }
      const { message } = (await nonceRes.json()) as {
        nonce: string;
        message: string;
      };

      const signature = await signMessage(message, primary.chain);

      setState({ status: "verifying" });
      const verifyRes = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: primary.chain,
          address: primary.address,
          message,
          signature,
        }),
      });
      if (!verifyRes.ok) {
        const body = (await verifyRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `Verify failed (${verifyRes.status})`);
      }
      const result = (await verifyRes.json()) as {
        userId: string;
        isNewUser: boolean;
      };
      signedAddressRef.current = primary.address;
      setState({
        status: "success",
        userId: result.userId,
        isNewUser: result.isNewUser,
      });
      onSuccess?.({ userId: result.userId, isNewUser: result.isNewUser });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed";
      setState({ status: "error", message });
    }
  }, [primary, signMessage, onSuccess]);

  // Auto-sign on connect.
  useEffect(() => {
    if (!autoOnConnect) return;
    if (!isConnected || !primary) return;
    if (signedAddressRef.current === primary.address) return;
    if (state.status === "signing" || state.status === "verifying") return;
    void signIn();
    // intentionally not depending on `state`/`signIn` to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOnConnect, isConnected, primary?.address]);

  // Reset signed-address tracking when the wallet disconnects.
  useEffect(() => {
    if (!isConnected) {
      signedAddressRef.current = null;
      setState({ status: "idle" });
    }
  }, [isConnected]);

  return { state, signIn };
}
