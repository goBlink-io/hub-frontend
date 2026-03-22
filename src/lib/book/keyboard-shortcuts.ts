export interface KeyboardShortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  label: string;
  description: string;
  group: "Navigation" | "Editor" | "Publishing";
}

export const shortcuts: KeyboardShortcut[] = [
  { key: "k", meta: true, label: "Cmd+K", description: "Open search", group: "Navigation" },
  { key: "n", meta: true, label: "Cmd+N", description: "New page", group: "Editor" },
  { key: "s", meta: true, label: "Cmd+S", description: "Save", group: "Editor" },
  { key: "p", meta: true, label: "Cmd+P", description: "Publish / unpublish toggle", group: "Publishing" },
  { key: ",", meta: true, label: "Cmd+,", description: "Open settings", group: "Navigation" },
  { key: "Escape", label: "Esc", description: "Close modal", group: "Navigation" },
  { key: "?", label: "?", description: "Show keyboard shortcuts", group: "Navigation" },
];
