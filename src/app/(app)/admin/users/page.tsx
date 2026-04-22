import type { Metadata } from "next";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Users
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Promote team members to admin. Role changes are audited.
        </p>
      </div>
      <AdminUsersTable />
    </div>
  );
}
