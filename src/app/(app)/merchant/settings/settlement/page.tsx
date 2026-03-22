import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { Wallet } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settlement — Merchant" };

export default function SettlementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Settlement Settings</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Configure how you receive your funds.</p>
      </div>
      <MerchantPageStub
        title="Settlement Configuration"
        description="Choose your settlement chain, token, and wallet address. Configure automatic settlement or manual withdrawal."
        icon={Wallet}
      />
    </div>
  );
}
