import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";

export const metadata: Metadata = { title: "Settings — Merchant" };

export default function MerchantSettingsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Merchant", href: "/merchant" },
        { label: "Settings" },
      ]} />
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Settings</h1>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>Manage your merchant account settings.</p>
      </div>
      <MerchantPageStub
        title="Merchant Settings"
        description="Business profile, API keys, display currency, notification preferences, and security settings."
        icon={Settings}
      />
    </div>
  );
}
