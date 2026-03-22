import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { Store } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "POS — Merchant" };

export default function POSPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Point of Sale</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Accept in-person crypto payments.</p>
      </div>
      <MerchantPageStub
        title="Point of Sale"
        description="Turn any device into a crypto POS terminal. Enter an amount, generate a QR code, and accept payments face-to-face."
        icon={Store}
      />
    </div>
  );
}
