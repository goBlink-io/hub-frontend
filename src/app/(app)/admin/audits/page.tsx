import type { Metadata } from "next";
import { AdminAuditsTable } from "@/components/admin/AdminAuditsTable";

export const metadata: Metadata = { title: "Audits" };

export default function AdminAuditsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Audits
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Every audit submitted by every user. Sort by status, source, or user
          ID.
        </p>
      </div>
      <AdminAuditsTable />
    </div>
  );
}
