"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, FileText, Clock, CheckCircle, Loader2, ThumbsUp } from "lucide-react";
import type { BBPage, BBPageFeedbackSummary } from "@/types/book";

export default function PagesListPage() {
  const params = useParams<{ siteId: string }>();
  const router = useRouter();
  const [pages, setPages] = useState<BBPage[]>([]);
  const [feedback, setFeedback] = useState<Map<string, BBPageFeedbackSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchPages = useCallback(async () => {
    const res = await fetch(`/api/book/spaces/${params.siteId}/pages`);
    if (res.ok) setPages(await res.json());
    setLoading(false);
  }, [params.siteId]);

  const fetchFeedback = useCallback(async () => {
    const res = await fetch(`/api/book/feedback?space_id=${params.siteId}`);
    if (res.ok) {
      const summaries: BBPageFeedbackSummary[] = await res.json();
      setFeedback(new Map(summaries.map((s) => [s.page_id, s])));
    }
  }, [params.siteId]);

  useEffect(() => {
    fetchPages();
    fetchFeedback();
  }, [fetchPages, fetchFeedback]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/book/spaces/${params.siteId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      if (res.ok) {
        const page = await res.json();
        router.push(`/book/${params.siteId}/editor/${page.id}`);
      }
    } finally {
      setCreating(false);
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
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Pages
          </h1>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
          >
            <Plus size={14} />
            New Page
          </button>
        </div>

        {pages.length === 0 ? (
          <div
            className="p-12 text-center"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <FileText size={40} style={{ color: "var(--color-text-tertiary)" }} className="mx-auto mb-3" />
            <p className="mb-4" style={{ color: "var(--color-text-secondary)" }}>
              No pages yet. Create your first page to get started.
            </p>
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white transition"
              style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
            >
              <Plus size={16} />
              New Page
            </button>
          </div>
        ) : (
          <div
            className="divide-y [&>*+*]:border-[var(--color-border)]"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => router.push(`/book/${params.siteId}/editor/${page.id}`)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:opacity-80"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText size={16} style={{ color: "var(--color-text-tertiary)" }} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {page.title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      /{page.slug}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {feedback.get(page.id) && (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      <ThumbsUp size={12} />
                      {feedback.get(page.id)!.helpful_pct}%
                    </span>
                  )}
                  <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                    {new Date(page.updated_at).toLocaleDateString()}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-xs"
                    style={{
                      color: page.is_published ? "var(--color-success)" : "var(--color-text-tertiary)",
                      backgroundColor: page.is_published ? "rgba(34,197,94,0.1)" : "var(--color-bg-tertiary)",
                    }}
                  >
                    {page.is_published ? "Published" : "Draft"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
