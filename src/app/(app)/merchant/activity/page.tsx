import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { Activity } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Activity — Merchant" };

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Activity</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Real-time feed of all merchant events.</p>
      </div>
      <MerchantPageStub
        title="Activity Feed"
        description="Live stream of payments, webhook deliveries, API key usage, and account events. Filter by type and date range."
        icon={Activity}
      />
    </div>
  );
}
