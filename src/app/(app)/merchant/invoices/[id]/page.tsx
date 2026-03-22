import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Invoice Detail — Merchant" };

export default function InvoiceDetailPage() {
  return (
    <MerchantPageStub
      title="Invoice Detail"
      description="View invoice details, payment history, and send reminders."
      icon={FileText}
    />
  );
}
