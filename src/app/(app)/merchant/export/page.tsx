import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { Download } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Export — Merchant" };

export default function ExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Export</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Export payment data and tax summaries.</p>
      </div>
      <MerchantPageStub
        title="Data Export"
        description="Export payments as CSV with custom date ranges. Generate tax summaries for accounting. Download transaction receipts."
        icon={Download}
      />
    </div>
  );
}
