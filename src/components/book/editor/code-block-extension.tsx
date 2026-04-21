/**
 * Code block extension for Tiptap, backed by `lowlight` for syntax
 * highlighting. Exports a pre-configured node that slots into the
 * editor's extensions list.
 *
 * For v1 we rely on the built-in (non-React) node view. Copy-button /
 * language-picker UI is a follow-up if the raw UX feels lacking.
 */
"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

export const EnhancedCodeBlock = CodeBlockLowlight.configure({
  lowlight,
  HTMLAttributes: { class: "code-block" },
  defaultLanguage: "plaintext",
});
