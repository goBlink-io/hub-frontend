/**
 * Callout block extension for Tiptap.
 *
 * Renders as a dedicated node with a `variant` attribute (info / warning /
 * danger / success). Stores as JSON in the page content so the published
 * renderer (tiptap-renderer.tsx) can style it consistently.
 */
"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

export type CalloutVariant = "info" | "warning" | "danger" | "success";

const VARIANT_STYLES: Record<
  CalloutVariant,
  { icon: ReactNode; color: string; bg: string; border: string }
> = {
  info: {
    icon: <Info size={16} />,
    color: "var(--color-primary)",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    color: "var(--color-warning)",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
  },
  danger: {
    icon: <AlertOctagon size={16} />,
    color: "var(--color-danger)",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
  },
  success: {
    icon: <CheckCircle2 size={16} />,
    color: "var(--color-success)",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.25)",
  },
};

function asVariant(v: unknown): CalloutVariant {
  return v === "warning" || v === "danger" || v === "success" ? v : "info";
}

function CalloutView({ node }: { node: { attrs: { variant?: unknown } } }) {
  const variant = asVariant(node.attrs.variant);
  const s = VARIANT_STYLES[variant];
  return (
    <NodeViewWrapper
      data-callout={variant}
      className="my-4 flex gap-3 px-4 py-3"
      style={{
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.color}`,
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="shrink-0 pt-0.5" style={{ color: s.color }}>
        {s.icon}
      </div>
      <div className="flex-1">
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-callout") ?? "info",
        renderHTML: (attrs) => ({
          "data-callout": String(attrs.variant ?? "info"),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "callout" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});
