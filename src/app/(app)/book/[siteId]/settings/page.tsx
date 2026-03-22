"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Settings, Loader2, Check } from "lucide-react";
import type { BBSpace } from "@/types/book";

type Tab = "general" | "branding" | "domain" | "seo" | "danger";

export default function SpaceSettingsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const [space, setSpace] = useState<BBSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("general");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/book/spaces/${siteId}`)
      .then((r) => r.json())
      .then((data: BBSpace) => {
        setSpace(data);
        setName(data.name);
        setSlug(data.slug);
        setDescription(data.description ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/book/spaces/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, description: description || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSpace(updated);
      setMessage({ type: "success", text: "Settings saved" });
    } else {
      const err = await res.json();
      setMessage({ type: "error", text: err.error || "Failed to save" });
    }
    setSaving(false);
  }, [siteId, name, slug, description]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "branding", label: "Branding" },
    { id: "domain", label: "Domain" },
    { id: "seo", label: "SEO" },
    { id: "danger", label: "Danger Zone" },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
        <Settings size={24} />
        Settings
      </h1>

      {message && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: message.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${message.type === "success" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: message.type === "success" ? "var(--color-success)" : "var(--color-error)",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto" style={{ borderBottom: "1px solid var(--color-border)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="whitespace-nowrap px-4 py-2.5 text-sm font-medium transition"
            style={{
              color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              borderBottom: tab === t.id ? "2px solid var(--color-primary)" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Site name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 text-sm outline-none transition"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              URL slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-4 py-3 text-sm outline-none transition"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none px-4 py-3 text-sm outline-none transition"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Changes
          </button>
        </div>
      )}

      {tab !== "general" && (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <Settings size={32} style={{ color: "var(--color-text-tertiary)" }} className="mb-3" />
          <p style={{ color: "var(--color-text-secondary)" }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)} settings coming soon
          </p>
        </div>
      )}
    </div>
  );
}
