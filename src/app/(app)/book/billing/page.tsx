import { CreditCard } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "BlinkBook — Billing" };

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1
        className="mb-6 flex items-center gap-2 text-2xl font-bold"
        style={{ color: "var(--color-text-primary)" }}
      >
        <CreditCard size={24} />
        Billing
      </h1>
      <div
        className="flex flex-col items-center justify-center py-20 text-center"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <CreditCard size={48} style={{ color: "var(--color-text-tertiary)" }} className="mb-4" />
        <p style={{ color: "var(--color-text-secondary)" }}>
          Billing management coming soon
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
          Stripe and crypto billing will be available here.
        </p>
      </div>
    </div>
  );
}
