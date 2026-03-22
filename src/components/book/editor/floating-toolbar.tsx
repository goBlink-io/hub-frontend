/**
 * Floating formatting toolbar for the Tiptap editor.
 * Requires @tiptap/core to be installed.
 */
"use client";

// TODO: Uncomment when @tiptap/core is installed
// import type { Editor } from "@tiptap/core";
import { Bold, Italic, Strikethrough, Code, Link2, Heading1, Heading2, Heading3, Heading4, Type } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

// Stub Editor type — replace with real import once @tiptap/core is installed
type Editor = Record<string, unknown>;

interface FloatingToolbarProps {
  editor: Editor;
}

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  // This component is a placeholder until @tiptap packages are installed.
  // The full implementation matches the BlinkBook source: heading picker,
  // bold/italic/strike/code/link buttons, positioned via editor coordinates.
  return null;
}
