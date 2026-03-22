import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { RotateCcw } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refunds — Merchant" };

export default function RefundsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Refunds</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Manage payment refunds.</p>
      </div>
      <MerchantPageStub
        title="Refund Management"
        description="View all refunds, issue full or partial refunds, and track refund status. Refunds are processed on-chain."
        icon={RotateCcw}
      />
    </div>
  );
}
