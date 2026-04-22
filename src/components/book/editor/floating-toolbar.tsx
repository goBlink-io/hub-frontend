/**
 * Floating formatting toolbar for the Tiptap editor.
 *
 * Appears above the selection when the user has a non-empty text
 * selection. Offers bold / italic / underline / strike / code / link
 * + heading level picker. Position is computed from the ProseMirror
 * selection's DOM range — no third-party popover library needed.
 */
"use client";

import type { Editor } from "@tiptap/core";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Strikethrough,
  Type,
  Underline,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface FloatingToolbarProps {
  editor: Editor;
}

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const barRef = useRef<HTMLDivElement | null>(null);

  const recompute = useCallback(() => {
    const { state, view } = editor;
    const { empty, from, to } = state.selection;
    if (empty || from === to) {
      setVisible(false);
      return;
    }
    try {
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      const top = Math.min(start.top, end.top) + window.scrollY - 40;
      const left =
        (Math.min(start.left, end.left) + Math.max(start.right, end.right)) / 2 +
        window.scrollX;
      setPos({ top, left });
      setVisible(true);
    } catch {
      setVisible(false);
    }
  }, [editor]);

  useEffect(() => {
    editor.on("selectionUpdate", recompute);
    editor.on("transaction", recompute);
    editor.on("blur", () => {
      // A beat so button clicks register before the toolbar vanishes.
      setTimeout(() => setVisible(false), 100);
    });
    return () => {
      editor.off("selectionUpdate", recompute);
      editor.off("transaction", recompute);
    };
  }, [editor, recompute]);

  if (!visible) return null;

  return (
    <div
      ref={barRef}
      className="pointer-events-auto fixed z-40 flex items-center gap-0.5 px-1 py-1"
      style={{
        top: pos.top,
        left: pos.left,
        transform: "translateX(-50%)",
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <HeadingPicker editor={editor} />
      <Divider />
      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Inline code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link")["href"] as
            | string
            | undefined;
          const url = window.prompt("URL", prev ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
        }}
      >
        <Link2 size={14} />
      </ToolbarButton>
    </div>
  );
}

function HeadingPicker({ editor }: { editor: Editor }) {
  return (
    <>
      <ToolbarButton
        title="Paragraph"
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <Type size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={14} />
      </ToolbarButton>
    </>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded p-1.5 transition"
      style={{
        color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        backgroundColor: active ? "var(--color-bg-tertiary)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      className="mx-0.5 h-5 w-px"
      style={{ backgroundColor: "var(--color-border)" }}
      aria-hidden
    />
  );
}
