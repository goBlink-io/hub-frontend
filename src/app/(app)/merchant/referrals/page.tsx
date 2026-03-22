import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Referrals — Merchant" };

export default function ReferralsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Referrals</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Earn rewards by referring other merchants.</p>
      </div>
      <MerchantPageStub
        title="Referral Program"
        description="Share your referral link and earn a percentage of fees from merchants you refer. Track your referrals and earnings."
        icon={Users}
      />
    </div>
  );
}
