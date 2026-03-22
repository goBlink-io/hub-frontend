# Tiptap Editor — Package Installation Required

The BlinkBook block editor requires Tiptap packages to be installed.
Until installed, the editor page uses a JSON textarea fallback.

## Required Packages

```bash
pnpm add @tiptap/core@^3.20.0 \
  @tiptap/react@^3.20.0 \
  @tiptap/starter-kit@^3.20.0 \
  @tiptap/pm@^3.20.0 \
  @tiptap/extension-blockquote@^3.20.0 \
  @tiptap/extension-bubble-menu@^3.20.0 \
  @tiptap/extension-code-block-lowlight@^3.20.0 \
  @tiptap/extension-heading@^3.20.0 \
  @tiptap/extension-horizontal-rule@^3.20.0 \
  @tiptap/extension-image@^3.20.0 \
  @tiptap/extension-link@^3.20.0 \
  @tiptap/extension-placeholder@^3.20.0 \
  @tiptap/extension-table@^3.20.0 \
  @tiptap/extension-table-cell@^3.20.0 \
  @tiptap/extension-table-header@^3.20.0 \
  @tiptap/extension-table-row@^3.20.0 \
  @tiptap/extension-underline@^3.20.0 \
  lowlight
```

## Also needed for DnD page tree

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## After Installation

Replace the JSON textarea fallback in:
- `src/app/(app)/book/[siteId]/editor/[pageId]/page.tsx`

With the full Tiptap editor components from:
- `src/components/book/editor/block-editor.tsx`
- `src/components/book/editor/editor-toolbar.tsx`
- `src/components/book/editor/editor-sidebar.tsx`
- `src/components/book/editor/floating-toolbar.tsx`
- `src/components/book/editor/slash-command.tsx`
- `src/components/book/editor/callout-extension.tsx`
- `src/components/book/editor/code-block-extension.tsx`
- `src/components/book/editor/page-tree.tsx`
- `src/components/book/editor/page-tree-item.tsx`

These component files are structured and ready — they just need the Tiptap
imports to resolve.
