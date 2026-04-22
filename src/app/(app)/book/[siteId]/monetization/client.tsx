"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

interface AcceptedToken {
  chain: string;
  symbol: string;
  contract_address?: string;
  decimals?: number;
}

interface PaidContent {
  id: string;
  space_id: string;
  page_id: string | null;
  price_usd: number;
  accepted_tokens: AcceptedToken[];
  is_active: boolean;
  created_at: string;
}

export function MonetizationClient({ siteId }: { siteId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<PaidContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    price_usd: "9.99",
    acceptedText:
      '[{"chain":"evm","symbol":"USDC","contract_address":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","decimals":6}]',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/book/spaces/${siteId}/paid-content`);
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    let accepted: AcceptedToken[];
    try {
      accepted = JSON.parse(form.acceptedText) as AcceptedToken[];
      if (!Array.isArray(accepted) || accepted.length === 0) {
        toast("accepted_tokens must be a non-empty array", "error");
        return;
      }
    } catch {
      toast("Invalid JSON for accepted tokens", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/book/spaces/${siteId}/paid-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_usd: Number(form.price_usd),
          accepted_tokens: accepted,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast(body.error ?? "Failed to create", "error");
        return;
      }
      toast("Paid content added", "success");
      void load();
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (contentId: string) => {
    const res = await fetch(
      `/api/book/spaces/${siteId}/paid-content/${contentId}`,
      { method: "DELETE" },
    );
    if (res.ok) void load();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1
        className="flex items-center gap-2 text-2xl font-bold"
        style={{ color: "var(--color-text-primary)" }}
      >
        <DollarSign size={24} />
        Monetization
      </h1>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Charge for premium pages. Buyers pay with any listed token and you
        confirm each purchase after reviewing the on-chain transaction.
      </p>

      <form
        onSubmit={create}
        className="grid gap-3 p-4"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <label className="space-y-1">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Price (USD)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price_usd}
            onChange={(e) => setForm({ ...form, price_usd: e.target.value })}
            className="w-full h-10 px-3 text-sm"
            style={{
              backgroundColor: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
            }}
          />
        </label>
        <label className="space-y-1">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Accepted tokens (JSON array)
          </span>
          <textarea
            value={form.acceptedText}
            onChange={(e) => setForm({ ...form, acceptedText: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 font-mono text-xs"
            style={{
              backgroundColor: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
            }}
          />
          <span
            className="text-xs"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Each entry: {"{ chain, symbol, contract_address?, decimals? }"}.
          </span>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 h-10 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
          }}
        >
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <Plus size={14} />
              Add paid content
            </>
          )}
        </button>
      </form>

      <div className="space-y-2">
        {loading ? (
          <div
            className="py-8 text-center text-sm"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div
            className="py-12 text-center text-sm"
            style={{
              color: "var(--color-text-tertiary)",
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px dashed var(--color-border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            No paid content yet. Add a price above to paywall this space.
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  ${Number(r.price_usd).toFixed(2)}
                  {r.page_id ? " · page-scoped" : " · space-wide"}
                </div>
                <div
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {r.accepted_tokens
                    .map((t) => `${t.symbol}/${t.chain}`)
                    .join(" · ")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(r.id)}
                aria-label="Remove"
                className="p-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
