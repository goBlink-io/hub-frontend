"use client";

import { Construction } from "lucide-react";

interface MerchantPageStubProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

/**
 * Placeholder for merchant pages that are structurally present
 * but awaiting full component migration.
 */
export function MerchantPageStub({ title, description, icon: Icon }: MerchantPageStubProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-20 rounded-xl"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      {Icon ? (
        <Icon className="h-12 w-12" style={{ color: "var(--color-primary)" }} />
      ) : (
        <Construction className="h-12 w-12" style={{ color: "var(--color-primary)" }} />
      )}
      <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h2>
      <p className="text-sm text-center max-w-md" style={{ color: "var(--color-text-secondary)" }}>
        {description}
      </p>
      <span
        className="text-xs font-medium px-3 py-1 rounded"
        style={{
          backgroundColor: "rgba(99,102,241,0.1)",
          color: "var(--color-primary)",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        Migration in progress
      </span>
    </div>
  );
}
