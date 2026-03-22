import { LinkIcon } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "BlinkBook — Links" };

export default function LinksPage() {
  const Icon = LinkIcon;
  return (
    <div className="max-w-3xl">
      <h1
        className="mb-6 flex items-center gap-2 text-2xl font-bold"
        style={{ color: "var(--color-text-primary)" }}
      >
        <Icon size={24} />
        Links
      </h1>
      <div
        className="flex flex-col items-center justify-center py-20 text-center"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <Icon size={48} style={{ color: "var(--color-text-tertiary)" }} className="mb-4" />
        <p style={{ color: "var(--color-text-secondary)" }}>
          Links management coming soon
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
          This feature is being built as part of the Hub migration.
        </p>
      </div>
    </div>
  );
}
