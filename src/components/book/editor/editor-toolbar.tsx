/**
 * Editor toolbar — shows space name, page title (editable), save status,
 * undo/redo, publish toggle, preview link, and markdown download.
 * Requires @tiptap/core for undo/redo controls.
 */
"use client";

import Link from "next/link";
import {
  ArrowLeft, Undo2, Redo2, Eye, EyeOff, ExternalLink,
  Check, Loader2, AlertCircle, Download,
} from "lucide-react";

type SaveStatus = "saved" | "saving" | "unsaved";

interface EditorToolbarProps {
  siteId: string;
  spaceName: string;
  pageTitle: string;
  onTitleChange: (title: string) => void;
  saveStatus: SaveStatus;
  isPublished: boolean;
  onTogglePublish: () => void;
  pageSlug: string;
  spaceSlug: string;
}

export function EditorToolbar({
  siteId,
  spaceName,
  pageTitle,
  onTitleChange,
  saveStatus,
  isPublished,
  onTogglePublish,
  pageSlug,
  spaceSlug,
}: EditorToolbarProps) {
  return (
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
            {spaceName}
          </span>
          <span className="hidden shrink-0 sm:inline" style={{ color: "var(--color-text-tertiary)" }}>
            /
          </span>
          <input
            type="text"
            value={pageTitle}
            onChange={(e) => onTitleChange(e.target.value)}
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
          onClick={onTogglePublish}
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
            href={`/sites/${spaceSlug}/${pageSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1.5 transition"
            style={{ color: "var(--color-text-tertiary)" }}
            title="Preview"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  switch (status) {
    case "saved":
      return (
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-success)", opacity: 0.7 }}>
          <Check size={12} /> Saved
        </span>
      );
    case "saving":
      return (
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          <Loader2 size={12} className="animate-spin" /> Saving...
        </span>
      );
    case "unsaved":
      return (
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-warning)", opacity: 0.7 }}>
          <AlertCircle size={12} /> Unsaved changes
        </span>
      );
  }
}
