import { Layout } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "BlinkBook — Templates" };

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1
        className="mb-6 flex items-center gap-2 text-2xl font-bold"
        style={{ color: "var(--color-text-primary)" }}
      >
        <Layout size={24} />
        Templates
      </h1>
      <div
        className="flex flex-col items-center justify-center py-20 text-center"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <Layout size={48} style={{ color: "var(--color-text-tertiary)" }} className="mb-4" />
        <p style={{ color: "var(--color-text-secondary)" }}>
          Doc site templates coming soon
        </p>
      </div>
    </div>
  );
}
