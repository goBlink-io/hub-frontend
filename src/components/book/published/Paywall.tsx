"use client";

/**
 * Paywall UI for the public renderer.
 *
 * Rendered when a page is gated and the visitor hasn't satisfied the
 * gate. Uses @goblink/connect to surface connected wallets; calls the
 * access-check endpoint with those wallets and either reveals the
 * content (via `onGranted`) or surfaces the unlock flow:
 *
 *   - Token gate: "Connect a qualifying wallet".
 *   - Paid content: "Buy for $X using one of these tokens" →
 *     creates a pending purchase, then prompts for tx_hash.
 */

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@goblink/connect/react";
import {
  Lock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Coins,
  Wallet,
} from "lucide-react";
import { TiptapContent } from "./tiptap-content";
import { renderTiptapDoc } from "./tiptap-renderer";
import type { TiptapDoc } from "@/types/book";

interface Verdict {
  gated: boolean;
  granted: boolean;
  reason:
    | "ungated"
    | "token-gate-satisfied"
    | "purchase-record"
    | "token-gate-required"
    | "purchase-required"
    | "unknown-visitor";
  rules: Array<{
    id: string;
    chain: string;
    contract_address: string;
    token_type: string;
    min_amount: string;
    token_id: string | null;
  }>;
  paidContent: Array<{
    id: string;
    page_id: string | null;
    price_usd: string | number;
    accepted_tokens: Array<{
      chain: string;
      symbol: string;
      contract_address?: string;
      decimals?: number;
    }>;
  }>;
}

interface PaywallProps {
  spaceSlug: string;
  pageSlug: string;
  spaceId: string;
}

export function Paywall({ spaceSlug, pageSlug, spaceId }: PaywallProps) {
  const { wallets } = useWallet();
  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [content, setContent] = useState<TiptapDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sites/${encodeURIComponent(spaceSlug)}/pages/${encodeURIComponent(
          pageSlug,
        )}/access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallets: wallets.map((w) => ({
              chain: w.chain,
              address: w.address,
            })),
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Failed (${res.status})`);
        return;
      }
      const json = (await res.json()) as {
        verdict: Verdict;
        content: TiptapDoc | null;
      };
      setVerdict(json.verdict);
      setContent(json.content);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [spaceSlug, pageSlug, wallets]);

  useEffect(() => {
    void check();
  }, [check]);

  if (loading && !verdict) {
    return (
      <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
        <Loader2 size={16} className="mr-2 animate-spin" />
        Checking access…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-sm" style={{ color: "var(--color-danger)" }}>
        <AlertTriangle size={24} className="mx-auto mb-2" />
        {error}
      </div>
    );
  }

  if (verdict?.granted && content) {
    const html = renderTiptapDoc(content);
    return <TiptapContent html={html} />;
  }

  return (
    <PaywallCard
      verdict={verdict}
      spaceId={spaceId}
      onRefresh={check}
    />
  );
}

function PaywallCard({
  verdict,
  spaceId,
  onRefresh,
}: {
  verdict: Verdict | null;
  spaceId: string;
  onRefresh: () => void;
}) {
  const { wallets, isConnected } = useWallet();
  const hasTokenGate = (verdict?.rules.length ?? 0) > 0;
  const hasPaywall = (verdict?.paidContent.length ?? 0) > 0;

  return (
    <div
      className="mx-auto max-w-xl space-y-5 p-8 text-center"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
      }}
    >
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center"
        style={{
          backgroundColor: "rgba(245, 158, 11, 0.12)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "999px",
          color: "var(--color-warning)",
        }}
      >
        <Lock size={20} />
      </div>

      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {hasTokenGate && hasPaywall
            ? "This page is gated"
            : hasTokenGate
              ? "Token-gated content"
              : "Premium content"}
        </h2>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {hasTokenGate
            ? "Connect a qualifying wallet to read this page."
            : "Complete a one-time purchase to read this page."}
        </p>
      </div>

      {hasTokenGate && (
        <div className="space-y-2 text-left">
          <div
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Token gate
          </div>
          {verdict?.rules.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 text-sm"
              style={{
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            >
              <Coins size={14} style={{ color: "var(--color-primary)" }} />
              <div className="flex-1 min-w-0">
                <div className="truncate font-mono text-xs">
                  {r.chain.toUpperCase()} · {r.contract_address}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Hold ≥ {r.min_amount} {r.token_type.toUpperCase()}
                  {r.token_id ? ` #${r.token_id}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasPaywall && (
        <div className="space-y-2 text-left">
          <div
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Purchase
          </div>
          {verdict?.paidContent.map((pc) => (
            <PurchaseRow
              key={pc.id}
              spaceId={spaceId}
              content={pc}
              walletConnected={isConnected}
              wallets={wallets.map((w) => ({ chain: w.chain, address: w.address }))}
              onPurchased={onRefresh}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm"
          style={{
            color: "var(--color-text-secondary)",
            backgroundColor: "var(--color-bg-tertiary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Wallet size={14} />
          Re-check access
        </button>
      </div>
    </div>
  );
}

function PurchaseRow({
  spaceId,
  content,
  walletConnected,
  wallets,
  onPurchased,
}: {
  spaceId: string;
  content: Verdict["paidContent"][number];
  walletConnected: boolean;
  wallets: Array<{ chain: string; address: string }>;
  onPurchased: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [payoutWallet, setPayoutWallet] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitted" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const primary = wallets[0];

  const create = async () => {
    if (!primary) return;
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch(`/api/book/spaces/${spaceId}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paid_content_id: content.id,
          buyer_wallet: primary.address,
          buyer_chain: primary.chain,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(body.error ?? "Failed to start purchase");
        return;
      }
      const json = (await res.json()) as {
        purchase: { id: string };
        payoutWallet: string | null;
      };
      setPurchaseId(json.purchase.id);
      setPayoutWallet(json.payoutWallet);
    } finally {
      setCreating(false);
    }
  };

  const submit = async () => {
    if (!purchaseId || !primary || !txHash.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/book/purchases/${purchaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_hash: txHash.trim(),
          buyer_wallet: primary.address,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(body.error ?? "Failed to submit transaction");
        return;
      }
      setStatus("submitted");
      onPurchased();
    } finally {
      setSubmitting(false);
    }
  };

  const priceLabel = `$${Number(content.price_usd).toFixed(2)}`;

  return (
    <div
      className="space-y-3 p-3 text-sm"
      style={{
        backgroundColor: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ color: "var(--color-text-primary)" }}>
          Unlock for <strong>{priceLabel}</strong>
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {content.accepted_tokens
            .map((t) => `${t.symbol}/${t.chain}`)
            .join(" · ")}
        </span>
      </div>

      {!walletConnected && (
        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          Connect a wallet to begin.
        </p>
      )}

      {walletConnected && !purchaseId && (
        <button
          type="button"
          onClick={create}
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 h-9 w-full text-sm font-medium"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
          }}
        >
          {creating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            "Start purchase"
          )}
        </button>
      )}

      {purchaseId && status !== "submitted" && (
        <div className="space-y-2">
          <p
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Send {priceLabel} worth of an accepted token to the creator&apos;s
            wallet, then paste the tx hash below.
          </p>
          {payoutWallet && (
            <div
              className="flex items-center justify-between gap-2 px-2 py-1.5 font-mono text-xs"
              style={{
                backgroundColor: "var(--color-bg-primary)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text-primary)",
              }}
            >
              <span className="truncate">{payoutWallet}</span>
              <button
                type="button"
                className="shrink-0 text-xs"
                onClick={() => navigator.clipboard.writeText(payoutWallet)}
                style={{ color: "var(--color-primary)" }}
              >
                Copy
              </button>
            </div>
          )}
          <input
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Transaction hash"
            className="w-full h-9 px-3 text-sm"
            style={{
              backgroundColor: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !txHash.trim()}
            className="inline-flex items-center justify-center gap-2 h-9 w-full text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
            }}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Submit transaction"
            )}
          </button>
        </div>
      )}

      {status === "submitted" && (
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--color-success)" }}
        >
          <CheckCircle2 size={14} />
          Submitted — awaiting creator confirmation.
        </div>
      )}

      {err && (
        <div
          className="text-xs"
          style={{ color: "var(--color-danger)" }}
        >
          {err}
        </div>
      )}
    </div>
  );
}
