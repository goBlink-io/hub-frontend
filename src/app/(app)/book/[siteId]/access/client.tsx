"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

interface Rule {
  id: string;
  space_id: string;
  page_id: string | null;
  chain: string;
  contract_address: string;
  token_type: string;
  min_amount: string;
  token_id: string | null;
  is_active: boolean;
  created_at: string;
}

const CHAIN_OPTIONS = [
  "evm",
  "solana",
  "sui",
  "near",
  "aptos",
  "bitcoin",
  "starknet",
  "ton",
  "tron",
];

const TOKEN_TYPE_OPTIONS = ["native", "erc20", "erc721", "erc1155", "spl", "nft"];

export function AccessRulesClient({ siteId }: { siteId: string }) {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    chain: "evm",
    contract_address: "",
    token_type: "erc20",
    min_amount: "1",
    token_id: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/book/spaces/${siteId}/access-rules`);
      if (res.ok) setRules(await res.json());
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contract_address.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/book/spaces/${siteId}/access-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: form.chain,
          contract_address: form.contract_address.trim(),
          token_type: form.token_type,
          min_amount: form.min_amount || "1",
          token_id: form.token_id.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast(body.error ?? "Failed to create rule", "error");
        return;
      }
      toast("Rule created", "success");
      setForm({ ...form, contract_address: "", token_id: "" });
      void load();
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (ruleId: string) => {
    const res = await fetch(
      `/api/book/spaces/${siteId}/access-rules/${ruleId}`,
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
        <Shield size={24} />
        Access rules
      </h1>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Require visitors to hold a specific token to read this space. Any
        active rule grants access; rules stack (any-match).
      </p>

      <form
        onSubmit={create}
        className="grid gap-3 p-4 sm:grid-cols-2"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <Select
          label="Chain"
          value={form.chain}
          onChange={(v) => setForm({ ...form, chain: v })}
          options={CHAIN_OPTIONS}
        />
        <Select
          label="Token type"
          value={form.token_type}
          onChange={(v) => setForm({ ...form, token_type: v })}
          options={TOKEN_TYPE_OPTIONS}
        />
        <Input
          label="Contract address"
          value={form.contract_address}
          onChange={(v) => setForm({ ...form, contract_address: v })}
          placeholder="0x... or 0x...::coin::COIN"
          className="sm:col-span-2"
        />
        <Input
          label="Minimum amount"
          value={form.min_amount}
          onChange={(v) => setForm({ ...form, min_amount: v })}
          placeholder="1"
        />
        <Input
          label="Token ID (optional)"
          value={form.token_id}
          onChange={(v) => setForm({ ...form, token_id: v })}
          placeholder="Only for ERC-721/1155 gating a specific ID"
        />
        <button
          type="submit"
          disabled={submitting || !form.contract_address.trim()}
          className="col-span-full inline-flex items-center justify-center gap-2 h-10 text-sm font-medium disabled:opacity-50"
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
              Add rule
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
        ) : rules.length === 0 ? (
          <div
            className="py-12 text-center text-sm"
            style={{
              color: "var(--color-text-tertiary)",
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px dashed var(--color-border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            No access rules yet. Add one above to token-gate this space.
          </div>
        ) : (
          rules.map((r) => (
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
                  className="truncate font-mono text-sm"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {r.chain.toUpperCase()} · {r.contract_address}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  ≥ {r.min_amount} {r.token_type.toUpperCase()}
                  {r.token_id ? ` · #${r.token_id}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(r.id)}
                aria-label="Remove rule"
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="space-y-1">
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 text-sm"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-primary)",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`space-y-1 ${className ?? ""}`}>
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 text-sm"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-primary)",
        }}
      />
    </label>
  );
}
