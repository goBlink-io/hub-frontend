import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/server/authz";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: { default: "Admin", template: "%s · Admin | goBlink" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The (app) parent layout already enforces an authenticated session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // 404 rather than 403 — don't leak the existence of the admin area.
  if (!user || !(await isAdmin(user.id))) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/admin/audits"
          className="inline-flex items-center gap-2"
        >
          <ShieldCheck size={16} style={{ color: "var(--color-primary)" }} />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Admin
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/admin/audits"
            className="px-3 h-9 inline-flex items-center"
            style={{
              color: "var(--color-text-secondary)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            Audits
          </Link>
          <Link
            href="/admin/users"
            className="px-3 h-9 inline-flex items-center"
            style={{
              color: "var(--color-text-secondary)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            Users
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
