/**
 * BlinkBook Block Editor — powered by Tiptap
 *
 * This component requires @tiptap/* packages to be installed.
 * See TODO-TIPTAP.md for the full list of required packages.
 *
 * Once installed, uncomment the imports and the full editor will work.
 */

"use client";

// TODO: Uncomment once @tiptap packages are installed
// import { useEditor, EditorContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Placeholder from "@tiptap/extension-placeholder";
// import Image from "@tiptap/extension-image";
// import { Table } from "@tiptap/extension-table";
// import TableRow from "@tiptap/extension-table-row";
// import TableCell from "@tiptap/extension-table-cell";
// import TableHeader from "@tiptap/extension-table-header";
// import Link from "@tiptap/extension-link";
// import { Callout } from "./callout-extension";
// import { EnhancedCodeBlock } from "./code-block-extension";
// import { FloatingToolbar } from "./floating-toolbar";
// import { SlashCommandMenu } from "./slash-command";

import type { TiptapDoc } from "@/types/book";

interface BlockEditorProps {
  initialContent: TiptapDoc;
  onUpdate: (content: TiptapDoc) => void;
}

export function BlockEditor({ initialContent, onUpdate }: BlockEditorProps) {
  // Fallback: render a notice when Tiptap isn't installed
  return (
    <div
      className="rounded-lg p-8 text-center"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
      }}
    >
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Block editor requires Tiptap packages. See TODO-TIPTAP.md.
      </p>
    </div>
  );
}
