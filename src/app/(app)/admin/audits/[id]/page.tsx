import type { Metadata } from "next";
import { AdminAuditDetail } from "@/components/admin/AdminAuditDetail";

export const metadata: Metadata = { title: "Audit detail" };

function getMaxBytes(): number {
  const raw = parseInt(process.env.ZION_MAX_UPLOAD_BYTES || "10485760", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10_485_760;
}

export default async function AdminAuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminAuditDetail id={id} maxBytes={getMaxBytes()} />;
}
