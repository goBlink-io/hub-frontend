"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  ExternalLink,
  Check,
  Loader2,
  AlertCircle,
  Download,
  ChevronDown,
  Search,
} from "lucide-react";
import { tiptapToMarkdown } from "@/lib/book/tiptap-to-markdown";
import type { TiptapDoc, BBPage, BBSpace } from "@/types/book";
import { useToast } from "@/contexts/ToastContext";

/*
 * TODO: Install Tiptap packages to enable the block editor.
 * Required packages:
 *   @tiptap/core @tiptap/react @tiptap/starter-kit @tiptap/pm
 *   @tiptap/extension-placeholder @tiptap/extension-image
 *   @tiptap/extension-table @tiptap/extension-table-row
 *   @tiptap/extension-table-cell @tiptap/extension-table-header
 *   @tiptap/extension-link @tiptap/extension-code-block-lowlight
 *   @tiptap/extension-underline @tiptap/extension-blockquote
 *   @tiptap/extension-heading @tiptap/extension-horizontal-rule
 *   @tiptap/extension-bubble-menu
 *   lowlight
 *
 * Until installed, the editor renders a JSON textarea fallback.
 */

type SaveStatus = "saved" | "saving" | "unsaved";

export default function EditorPage() {
  const params = useParams<{ siteId: string; pageId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { siteId, pageId } = params;

  const [page, setPage] = useState<BBPage | null>(null);
  const [space, setSpace] = useState<BBSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [title, setTitle] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [contentJson, setContentJson] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // SEO fields
  const [seoOpen, setSeoOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  useEffect(() => {
    async function load() {
      const [pageRes, spaceRes] = await Promise.all([
        fetch(`/api/book/spaces/${siteId}/pages/${pageId}`),
        fetch(`/api/book/spaces/${siteId}`),
      ]);

      if (!pageRes.ok || !spaceRes.ok) {
        router.push(`/book/${siteId}`);
        return;
      }

      const pageData: BBPage = await pageRes.json();
      const spaceData: BBSpace = await spaceRes.json();

      setPage(pageData);
      setSpace(spaceData);
      setTitle(pageData.title);
      setIsPublished(pageData.is_published);
      setSlug(pageData.slug);
      setMetaTitle(pageData.meta_title ?? "");
      setMetaDescription(pageData.meta_description ?? "");
      setContentJson(JSON.stringify(pageData.content, null, 2));
      setLoading(false);
    }
    load();
  }, [siteId, pageId, router]);

  const save = useCallback(
    async (data: Record<string, unknown>) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/book/spaces/${siteId}/pages/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        setSaveStatus(res.ok ? "saved" : "unsaved");
      } catch {
        setSaveStatus("unsaved");
      }
    },
    [siteId, pageId],
  );

  const debouncedSave = useCallback(
    (content: TiptapDoc) => {
      setSaveStatus("unsaved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        save({ content });
      }, 1000);
    },
    [save],
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      setSaveStatus("unsaved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        save({ title: newTitle });
      }, 1000);
    },
    [save],
  );

  const handleTogglePublish = useCallback(async () => {
    const newValue = !isPublished;
    setIsPublished(newValue);
    await save({ is_published: newValue });
    toast(newValue ? 'Published!' : 'Unpublished', 'success');
  }, [isPublished, save, toast]);

  const handleContentChange = useCallback(
    (rawJson: string) => {
      setContentJson(rawJson);
      try {
        const parsed = JSON.parse(rawJson) as TiptapDoc;
        debouncedSave(parsed);
      } catch {
        /* invalid JSON — don't save yet */
      }
    },
    [debouncedSave],
  );

  if (loading || !page || !space) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar */}
      <div
        className="flex h-12 shrink-0 items-center justify-between px-4"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/book/${siteId}`}
            className="p-1 transition"
            style={{ color: "var(--color-text-tertiary)" }}
            title="Back to space"
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="hidden shrink-0 sm:inline" style={{ color: "var(--color-text-tertiary)" }}>
              {space.name}
            </span>
            <span className="hidden shrink-0 sm:inline" style={{ color: "var(--color-text-tertiary)" }}>
              /
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="min-w-[100px] max-w-[300px] truncate bg-transparent font-medium outline-none"
              style={{ color: "var(--color-text-primary)" }}
              placeholder="Untitled"
            />
          </div>

          <SaveStatusBadge status={saveStatus} />
        </div>

        <div className="flex items-center gap-1.5">
          <div className="mx-1 h-5 w-px" style={{ backgroundColor: "var(--color-border)" }} />

          <button
            type="button"
            onClick={handleTogglePublish}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition"
            style={{
              color: isPublished ? "var(--color-success)" : "var(--color-text-secondary)",
              backgroundColor: isPublished ? "rgba(34,197,94,0.1)" : "var(--color-bg-secondary)",
            }}
          >
            {isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
            {isPublished ? "Published" : "Draft"}
          </button>

          {isPublished && (
            <a
              href={`/sites/${space.slug}/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1.5 transition"
              style={{ color: "var(--color-text-tertiary)" }}
              title="Preview"
            >
              <ExternalLink size={16} />
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              try {
                const parsed = JSON.parse(contentJson) as TiptapDoc;
                const markdown = tiptapToMarkdown(parsed);
                const blob = new Blob([markdown], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${slug || "page"}.md`;
                a.click();
                URL.revokeObjectURL(url);
              } catch { /* invalid JSON */ }
            }}
            className="rounded p-1.5 transition"
            style={{ color: "var(--color-text-tertiary)" }}
            title="Download as Markdown"
            aria-label="Download as Markdown"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* TODO: Replace with Tiptap BlockEditor once packages are installed */}
          <div className="mb-4 rounded-lg px-3 py-2 text-xs" style={{
            backgroundColor: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            color: "var(--color-warning)",
          }}>
            Tiptap editor will render here once @tiptap packages are installed. Using JSON fallback.
          </div>
          <textarea
            value={contentJson}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-[500px] w-full resize-none font-mono text-sm outline-none"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              color: "var(--color-text-primary)",
              padding: "16px",
            }}
            spellCheck={false}
          />
        </div>

        {/* SEO Panel */}
        <div style={{ borderTop: "1px solid var(--color-border)" }}>
          <button
            onClick={() => setSeoOpen((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-3 text-sm font-medium transition"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span className="flex items-center gap-2">
              <Search size={16} />
              SEO Settings
            </span>
            <ChevronDown
              size={16}
              className={`transition-transform ${seoOpen ? "rotate-180" : ""}`}
            />
          </button>
          {seoOpen && (
            <div className="space-y-5 px-6 pb-6">
              <div className="max-w-xl">
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Meta Title
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => {
                    setMetaTitle(e.target.value);
                    setSaveStatus("unsaved");
                    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                    saveTimerRef.current = setTimeout(() => {
                      save({ meta_title: e.target.value.trim() || null });
                    }, 1000);
                  }}
                  placeholder={page.title}
                  className="w-full px-3 py-2 text-sm outline-none transition"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>
              <div className="max-w-xl">
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Meta Description
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => {
                    setMetaDescription(e.target.value);
                    setSaveStatus("unsaved");
                    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                    saveTimerRef.current = setTimeout(() => {
                      save({ meta_description: e.target.value.trim() || null });
                    }, 1000);
                  }}
                  rows={2}
                  placeholder="A short description for search engines…"
                  className="w-full resize-none px-3 py-2 text-sm outline-none transition"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    color: "var(--color-text-primary)",
                  }}
                />
                <div className="mt-1 flex justify-end">
                  <span
                    className="text-xs"
                    style={{
                      color:
                        metaDescription.length >= 150 && metaDescription.length <= 160
                          ? "var(--color-success)"
                          : metaDescription.length > 160
                            ? "var(--color-warning)"
                            : "var(--color-text-tertiary)",
                    }}
                  >
                    {metaDescription.length}/160
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  switch (status) {
    case "saved":
      return (
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-success)", opacity: 0.7 }}>
          <Check size={12} />
          Saved
        </span>
      );
    case "saving":
      return (
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          <Loader2 size={12} className="animate-spin" />
          Saving...
        </span>
      );
    case "unsaved":
      return (
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-warning)", opacity: 0.7 }}>
          <AlertCircle size={12} />
          Unsaved changes
        </span>
      );
  }
}
