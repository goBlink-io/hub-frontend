/**
 * Slash command menu for the Tiptap editor.
 * Requires @tiptap/core to be installed.
 */
"use client";

// Stub Editor type — replace with real import once @tiptap/core is installed
type Editor = Record<string, unknown>;

interface SlashCommandProps {
  editor: Editor;
  position: { top: number; left: number };
  query: string;
  onClose: () => void;
  onSelect: (range: { from: number; to: number }) => void;
  range: { from: number; to: number };
}

export function SlashCommandMenu(_props: SlashCommandProps) {
  // This component is a placeholder until @tiptap packages are installed.
  // The full implementation shows paragraph, heading 1-4, code block, callout,
  // image, table, horizontal rule, blockquote, bullet list, ordered list.
  return null;
}
