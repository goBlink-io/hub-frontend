import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { Landmark } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cash Out — Merchant" };

export default function OfframpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Cash Out</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Convert crypto earnings to fiat.</p>
      </div>
      <MerchantPageStub
        title="Cash Out"
        description="Convert your crypto earnings to fiat via Coinbase, Shakepay, or other off-ramp providers. Available in select regions."
        icon={Landmark}
      />
    </div>
  );
}
