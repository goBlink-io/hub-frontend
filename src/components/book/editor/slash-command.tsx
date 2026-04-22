/**
 * Slash command palette for the Tiptap editor.
 *
 * Appears next to the cursor when the user types `/`. Filters by what
 * follows the slash. Enter / click inserts the selected block; Escape
 * closes. Position is provided by the parent (BlockEditor) based on
 * editor coordinates — this component is purely visual.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  AlertTriangle,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Table,
  Type,
} from "lucide-react";
import type { ComponentType } from "react";

type Range = { from: number; to: number };

interface SlashCommandProps {
  editor: Editor;
  position: { top: number; left: number };
  query: string;
  onClose: () => void;
  onSelect: (range: Range) => void;
  range: Range;
}

interface Item {
  label: string;
  keywords: string[];
  icon: ComponentType<{ size?: number }>;
  run: (editor: Editor, range: Range) => void;
}

const ITEMS: Item[] = [
  {
    label: "Text",
    keywords: ["paragraph", "text", "p"],
    icon: Type,
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setNode("paragraph").run(),
  },
  {
    label: "Heading 1",
    keywords: ["h1", "heading", "title"],
    icon: Heading1,
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setNode("heading", { level: 1 }).run(),
  },
  {
    label: "Heading 2",
    keywords: ["h2", "heading"],
    icon: Heading2,
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setNode("heading", { level: 2 }).run(),
  },
  {
    label: "Heading 3",
    keywords: ["h3", "heading"],
    icon: Heading3,
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setNode("heading", { level: 3 }).run(),
  },
  {
    label: "Bullet list",
    keywords: ["list", "ul", "bullet"],
    icon: List,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run(),
  },
  {
    label: "Numbered list",
    keywords: ["list", "ol", "numbered", "ordered"],
    icon: ListOrdered,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run(),
  },
  {
    label: "Task list",
    keywords: ["todo", "checklist", "task"],
    icon: ListChecks,
    run: (e, r) => {
      const chain = e.chain().focus().deleteRange(r) as ReturnType<typeof e.chain>;
      const ext = chain as unknown as { toggleTaskList?: () => typeof chain };
      if (typeof ext.toggleTaskList === "function") {
        ext.toggleTaskList().run();
      } else {
        // TaskList extension not registered — fall back to bullet list.
        chain.toggleBulletList().run();
      }
    },
  },
  {
    label: "Code block",
    keywords: ["code", "pre"],
    icon: Code,
    run: (e, r) => e.chain().focus().deleteRange(r).setCodeBlock().run(),
  },
  {
    label: "Quote",
    keywords: ["quote", "blockquote"],
    icon: Quote,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run(),
  },
  {
    label: "Callout",
    keywords: ["callout", "admonition", "info"],
    icon: AlertTriangle,
    run: (e, r) =>
      e
        .chain()
        .focus()
        .deleteRange(r)
        .insertContent({
          type: "callout",
          attrs: { variant: "info" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    label: "Divider",
    keywords: ["hr", "divider", "rule"],
    icon: Minus,
    run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run(),
  },
  {
    label: "Image",
    keywords: ["image", "img"],
    icon: ImageIcon,
    run: (e, r) => {
      const url = window.prompt("Image URL");
      if (!url) return;
      e.chain().focus().deleteRange(r).setImage({ src: url }).run();
    },
  },
  {
    label: "Table",
    keywords: ["table", "grid"],
    icon: Table,
    run: (e, r) =>
      e
        .chain()
        .focus()
        .deleteRange(r)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
];

export function SlashCommandMenu({
  editor,
  position,
  query,
  onClose,
  onSelect,
  range,
}: SlashCommandProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.keywords.some((k) => k.includes(q)),
    );
  }, [query]);

  // Active index is clamped at render time rather than re-synced via a
  // setState-in-effect (which the react-hooks rule flags as cascading).
  const [activeRaw, setActive] = useState(0);
  const active = filtered.length === 0 ? 0 : Math.min(activeRaw, filtered.length - 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        if (filtered.length > 0) {
          e.preventDefault();
          filtered[active].run(editor, range);
          onSelect(range);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editor, filtered, active, range, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="menu"
      aria-label="Insert block"
      className="pointer-events-auto fixed z-50 max-h-72 w-64 overflow-y-auto py-1 text-sm shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {filtered.map((item, idx) => {
        const Icon = item.icon;
        const isActive = idx === active;
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onMouseEnter={() => setActive(idx)}
            onMouseDown={(e) => {
              e.preventDefault();
              item.run(editor, range);
              onSelect(range);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
            style={{
              backgroundColor: isActive
                ? "var(--color-bg-tertiary)"
                : "transparent",
              color: "var(--color-text-primary)",
            }}
          >
            <Icon size={14} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
