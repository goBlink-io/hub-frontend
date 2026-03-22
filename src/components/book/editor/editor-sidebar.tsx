/**
 * Editor sidebar — shows page tree with drag-and-drop reordering.
 * Requires @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities.
 *
 * Until dependencies are installed, this renders a simple list fallback.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Menu, X, Plus, FileText } from "lucide-react";
import type { BBPage } from "@/types/book";

interface EditorSidebarProps {
  activePageId?: string;
}

export function EditorSidebar({ activePageId }: EditorSidebarProps) {
  const params = useParams<{ siteId: string }>();
  const [pages, setPages] = useState<BBPage[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchPages = useCallback(async () => {
    const res = await fetch(`/api/book/spaces/${params.siteId}/pages`);
    if (res.ok) setPages(await res.json());
  }, [params.siteId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    setMobileOpen(false);
  }, [activePageId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/book/spaces/${params.siteId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      if (res.ok) fetchPages();
    } finally {
      setCreating(false);
    }
  };

  const sidebarContent = (
    <>
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <Link href="/book" className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded"
            style={{ background: "linear-gradient(135deg, var(--color-primary), #7c3aed)" }}
          >
            <BookOpen size={12} className="text-white" />
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
            BlinkBook
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="p-1 transition lg:hidden"
          style={{ color: "var(--color-text-tertiary)" }}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Pages
        </span>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="rounded p-1 transition"
          style={{ color: "var(--color-text-tertiary)" }}
          title="New page"
          aria-label="Add new page"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {pages.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="mb-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              No pages yet
            </p>
            <button
              type="button"
              onClick={handleCreate}
              className="text-xs transition"
              style={{ color: "var(--color-primary)" }}
            >
              Create your first page
            </button>
          </div>
        ) : (
          pages.map((page) => {
            const isActive = page.id === activePageId;
            return (
              <Link
                key={page.id}
                href={`/book/${params.siteId}/editor/${page.id}`}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition"
                style={{
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  backgroundColor: isActive ? "var(--color-bg-secondary)" : "transparent",
                  marginLeft: `${(page.parent_id ? 16 : 0) + 4}px`,
                  marginRight: "4px",
                }}
              >
                <FileText size={14} style={{ color: "var(--color-text-tertiary)" }} />
                <span className="truncate">{page.title}</span>
              </Link>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="absolute left-2 top-2 z-30 rounded-lg p-2 transition lg:hidden"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-secondary)",
        }}
        aria-label="Open page tree"
      >
        <Menu size={16} />
      </button>

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[260px] transform flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: "var(--color-bg-primary)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden w-[260px] shrink-0 flex-col lg:flex"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
