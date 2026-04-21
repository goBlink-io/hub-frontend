import type { Metadata } from "next";
import { AuditJobView } from "@/components/audit/AuditJobView";

export const metadata: Metadata = {
  title: "Audit job",
};

function getMaxBytes(): number {
  const raw = parseInt(process.env.ZION_MAX_UPLOAD_BYTES || "10485760", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10_485_760;
}

export default async function AuditJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <AuditJobView jobId={jobId} maxBytes={getMaxBytes()} />;
}
