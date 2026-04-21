/**
 * BlinkBook block editor — powered by Tiptap.
 *
 * Wires StarterKit + Placeholder + Link + Image + Underline + Table(+row/
 * header/cell) + our custom Callout and EnhancedCodeBlock (lowlight) into
 * a single editor instance. Hosts the FloatingToolbar and SlashCommandMenu
 * overlays.
 *
 * The `initialContent` prop is the page's Tiptap JSON document (the shape
 * stored in `bb_pages.content`). `onUpdate` is called with the updated
 * document whenever the user edits — the parent page debounces and saves.
 */
"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { TiptapDoc } from "@/types/book";

import { Callout } from "./callout-extension";
import { EnhancedCodeBlock } from "./code-block-extension";
import { FloatingToolbar } from "./floating-toolbar";
import { SlashCommandMenu } from "./slash-command";

interface BlockEditorProps {
  initialContent: TiptapDoc;
  onUpdate: (content: TiptapDoc) => void;
  editable?: boolean;
}

interface SlashState {
  open: boolean;
  query: string;
  range: { from: number; to: number };
  position: { top: number; left: number };
}

const CLOSED_SLASH: SlashState = {
  open: false,
  query: "",
  range: { from: 0, to: 0 },
  position: { top: 0, left: 0 },
};

export function BlockEditor({
  initialContent,
  onUpdate,
  editable = true,
}: BlockEditorProps) {
  const [slash, setSlash] = useState<SlashState>(CLOSED_SLASH);
  const latestContentRef = useRef<TiptapDoc>(initialContent);

  const editor = useEditor({
    extensions: [
      // StarterKit bundles Document, Paragraph, Text, heading, bold,
      // italic, strike, blockquote, bullet list, ordered list, code,
      // hard break, history, etc. We explicitly disable the bundled
      // codeBlock because we ship EnhancedCodeBlock below.
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return "Heading";
          }
          return "Type '/' for commands, or just start writing…";
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        HTMLAttributes: { class: "my-4 rounded-lg" },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      EnhancedCodeBlock,
      Callout,
    ],
    content: initialContent,
    editable,
    // Preventing SSR-hydration mismatch — Tiptap renders a stub on the
    // server that won't match client state. This pushes rendering to
    // after mount.
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON() as TiptapDoc;
      latestContentRef.current = json;
      onUpdate(json);
      refreshSlash(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      refreshSlash(ed);
    },
  });

  // Keep editor content in sync when `initialContent` changes (e.g.
  // navigating to a different page via the sidebar).
  useEffect(() => {
    if (!editor) return;
    const incoming = JSON.stringify(initialContent);
    const current = JSON.stringify(editor.getJSON());
    if (incoming !== current) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
      latestContentRef.current = initialContent;
    }
  }, [editor, initialContent]);

  const refreshSlash = useCallback(
    (ed: Editor) => {
      const { state, view } = ed;
      const { $from, empty } = state.selection;
      if (!empty) {
        setSlash(CLOSED_SLASH);
        return;
      }
      const textBefore = $from.parent.textBetween(
        0,
        $from.parentOffset,
        undefined,
        "\0",
      );
      const match = /(?:^|\s)\/([^\s\/]*)$/.exec(textBefore);
      if (!match) {
        setSlash(CLOSED_SLASH);
        return;
      }
      const query = match[1];
      const slashStart = $from.pos - match[0].trimStart().length;
      try {
        const coords = view.coordsAtPos($from.pos);
        setSlash({
          open: true,
          query,
          range: { from: slashStart, to: $from.pos },
          position: {
            top: coords.bottom + window.scrollY + 4,
            left: coords.left + window.scrollX,
          },
        });
      } catch {
        setSlash(CLOSED_SLASH);
      }
    },
    [],
  );

  if (!editor) {
    return (
      <div
        className="min-h-[500px] w-full animate-pulse"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
        }}
      />
    );
  }

  return (
    <div className="relative">
      <EditorContent
        editor={editor}
        className="blinkbook-editor prose prose-invert max-w-none focus:outline-none"
      />
      <FloatingToolbar editor={editor} />
      {slash.open && (
        <SlashCommandMenu
          editor={editor}
          position={slash.position}
          query={slash.query}
          range={slash.range}
          onClose={() => setSlash(CLOSED_SLASH)}
          onSelect={() => setSlash(CLOSED_SLASH)}
        />
      )}
    </div>
  );
}
