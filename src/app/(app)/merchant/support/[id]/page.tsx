import { MerchantPageStub } from "@/components/merchant/MerchantPageStub";
import { LifeBuoy } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ticket Detail — Merchant" };

export default function TicketDetailPage() {
  return (
    <MerchantPageStub
      title="Support Ticket"
      description="View ticket details, messages, and reply to the support team."
      icon={LifeBuoy}
    />
  );
}
