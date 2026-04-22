"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Check, Loader2, Trash2, Star } from "lucide-react";
import type { BBVersion } from "@/types/book";

export default function VersionsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const [versions, setVersions] = useState<BBVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadVersions = useCallback(async () => {
    const res = await fetch(`/api/book/spaces/${siteId}/versions`);
    if (res.ok) setVersions(await res.json());
    setLoading(false);
  }, [siteId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadVersions(); }, [loadVersions]);

  const handleCreate = async () => {
    if (!label.trim()) return;
    setCreating(true);
    setMessage(null);
    const res = await fetch(`/api/book/spaces/${siteId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.error });
    } else {
      setMessage({ type: "success", text: `Version "${data.label}" created` });
      setLabel("");
      setShowCreate(false);
      await loadVersions();
    }
    setCreating(false);
  };

  const handleDelete = async (versionId: string, versionLabel: string) => {
    if (!confirm(`Delete version "${versionLabel}"?`)) return;
    const res = await fetch(`/api/book/spaces/${siteId}/versions/${versionId}`, { method: "DELETE" });
    if (res.ok) {
      setMessage({ type: "success", text: `Deleted "${versionLabel}"` });
      await loadVersions();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Versions</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition"
          style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
        >
          <Plus size={16} /> New Version
        </button>
      </div>

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

      {showCreate && (
        <div
          className="mb-6 p-5"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <p className="mb-4 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            Snapshot all published pages into a new version.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. v1.0"
              className="flex-1 px-3 py-2.5 text-sm outline-none transition"
              style={{
                backgroundColor: "var(--color-bg-tertiary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                color: "var(--color-text-primary)",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !label.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Create
            </button>
          </div>
        </div>
      )}

      {versions.length === 0 ? (
        <div
          className="p-12 text-center"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <Star size={40} style={{ color: "var(--color-text-tertiary)" }} className="mx-auto mb-3" />
          <p style={{ color: "var(--color-text-secondary)" }}>No versions yet</p>
        </div>
      ) : (
        <div
          className="divide-y"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between px-5 py-3.5 transition hover:opacity-80">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{v.label}</span>
                {v.is_current && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: "rgba(34,197,94,0.1)",
                      color: "var(--color-success)",
                      border: "1px solid rgba(34,197,94,0.2)",
                    }}
                  >
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {new Date(v.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(v.id, v.label)}
                  className="p-1 transition"
                  style={{ color: "var(--color-text-tertiary)" }}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
