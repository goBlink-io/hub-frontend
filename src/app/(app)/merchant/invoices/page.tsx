import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Invoices — Merchant" };

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Invoices</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Create and manage payment invoices.</p>
      </div>
      <MerchantPageStub
        title="Invoice Management"
        description="Create professional invoices, send them to clients, and track payment status. Supports recurring invoices and automatic reminders."
        icon={FileText}
      />
    </div>
  );
}
