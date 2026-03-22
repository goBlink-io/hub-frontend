import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { Link2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment Links — Merchant" };

export default function PaymentLinksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Payment Links</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Create shareable links for one-time or recurring payments.</p>
      </div>
      <MerchantPageStub
        title="Payment Links"
        description="Generate payment links with custom amounts, QR codes, and Farcaster frame support. Share via URL, QR, or social media."
        icon={Link2}
      />
    </div>
  );
}
