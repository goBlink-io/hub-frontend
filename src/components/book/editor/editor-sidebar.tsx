/**
 * Editor sidebar — page tree for a space.
 *
 * Drag-and-drop reordering via @dnd-kit. For v1 we treat the tree as a
 * flat ordered list (indent is purely visual, based on parent_id set by
 * other code paths). Dropping a page updates `position` on every page
 * in the space via POST /api/book/spaces/:id/pages/reorder.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, FileText, Menu, Plus, X } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BBPage } from "@/types/book";

interface EditorSidebarProps {
  activePageId?: string;
}

export function EditorSidebar({ activePageId }: EditorSidebarProps) {
  const params = useParams<{ siteId: string }>();
  const [pages, setPages] = useState<BBPage[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchPages = useCallback(async () => {
    const res = await fetch(`/api/book/spaces/${params.siteId}/pages`);
    if (res.ok) setPages(await res.json());
  }, [params.siteId]);

  useEffect(() => {
    void fetchPages();
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
      if (res.ok) void fetchPages();
    } finally {
      setCreating(false);
    }
  };

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(pages, oldIndex, newIndex);
      // Optimistic update.
      setPages(reordered);

      const payload = reordered.map((p, idx) => ({
        id: p.id,
        parent_id: p.parent_id ?? null,
        position: idx,
      }));
      try {
        const res = await fetch(
          `/api/book/spaces/${params.siteId}/pages/reorder`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pages: payload }),
          },
        );
        if (!res.ok) void fetchPages();
      } catch {
        void fetchPages();
      }
    },
    [pages, params.siteId, fetchPages],
  );

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pages.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {pages.map((page) => (
                <SortablePageRow
                  key={page.id}
                  page={page}
                  siteId={params.siteId}
                  active={page.id === activePageId}
                />
              ))}
            </SortableContext>
          </DndContext>
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

function SortablePageRow({
  page,
  siteId,
  active,
}: {
  page: BBPage;
  siteId: string;
  active: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    backgroundColor: active ? "var(--color-bg-secondary)" : "transparent",
    marginLeft: `${(page.parent_id ? 16 : 0) + 4}px`,
    marginRight: "4px",
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab items-center gap-2 rounded-md px-3 py-1.5 text-sm transition active:cursor-grabbing"
    >
      <FileText size={14} style={{ color: "var(--color-text-tertiary)" }} />
      <Link
        href={`/book/${siteId}/editor/${page.id}`}
        className="flex-1 truncate"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        {page.title}
      </Link>
    </div>
  );
}
