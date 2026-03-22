import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { Code } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Buttons — Merchant" };

export default function ButtonsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Embeddable Buttons</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Generate payment buttons for your website.</p>
      </div>
      <MerchantPageStub
        title="Button Generator"
        description="Create embeddable 'Pay with Crypto' buttons with customizable styles, amounts, and callback URLs. Copy the HTML snippet and paste it into your site."
        icon={Code}
      />
    </div>
  );
}
