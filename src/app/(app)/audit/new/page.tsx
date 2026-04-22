import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuditSubmitForm } from "@/components/audit/AuditSubmitForm";

export const metadata: Metadata = {
  title: "New audit",
};

function getMaxBytes(): number {
  const raw = parseInt(process.env.ZION_MAX_UPLOAD_BYTES || "10485760", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10_485_760;
}

function githubEnabled(): boolean {
  return process.env.ZION_GITHUB_AUDITS_ENABLED === "true";
}

export default function NewAuditPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <Link
          href="/audit"
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <ArrowLeft size={14} />
          Back to Audit
        </Link>
        <h1
          className="text-2xl font-bold mt-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          New audit
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Upload contract source to run formal verification, test generation, and
          pattern matching.
        </p>
      </div>
      <AuditSubmitForm maxBytes={getMaxBytes()} githubEnabled={githubEnabled()} />
    </div>
  );
}
