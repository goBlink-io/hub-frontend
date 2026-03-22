import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { LifeBuoy } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Support — Merchant" };

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Support</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Get help with your merchant account.</p>
      </div>
      <MerchantPageStub
        title="Support Tickets"
        description="Submit and track support tickets. View ticket history and communicate with the goBlink support team."
        icon={LifeBuoy}
      />
    </div>
  );
}
