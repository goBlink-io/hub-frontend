"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  Settings,
  BarChart3,
  Users,
  GitBranch,
  LinkIcon,
  Shield,
  DollarSign,
  ArrowLeft,
} from "lucide-react";

export default function BookLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ siteId?: string }>();
  const pathname = usePathname();
  const siteId = params.siteId;

  /* If inside the editor, skip the sidebar — full screen editor */
  const isEditorRoute = pathname.includes("/editor/");
  if (isEditorRoute) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-4 md:pt-6">
      {/* Breadcrumb header */}
      <div className="mb-6 flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        <Link href="/book" className="flex items-center gap-1.5 transition hover:opacity-80">
          <BookOpen size={16} style={{ color: "var(--color-primary)" }} />
          <span style={{ color: "var(--color-text-primary)" }} className="font-semibold">
            BlinkBook
          </span>
        </Link>
        {siteId && (
          <>
            <span style={{ color: "var(--color-text-tertiary)" }}>/</span>
            <span style={{ color: "var(--color-text-secondary)" }}>Site</span>
          </>
        )}
      </div>

      {siteId ? (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Site sub-navigation */}
          <aside className="shrink-0 lg:w-52">
            <Link
              href="/book"
              className="mb-4 flex items-center gap-1.5 text-sm transition hover:opacity-80"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <ArrowLeft size={14} />
              All sites
            </Link>
            <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {siteLinks.map((item) => {
                const href = `/book/${siteId}${item.path}`;
                const isActive =
                  item.path === ""
                    ? pathname === `/book/${siteId}`
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={item.path}
                    href={href}
                    className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition"
                    style={{
                      color: isActive
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                      backgroundColor: isActive ? "var(--color-bg-secondary)" : "transparent",
                    }}
                  >
                    <item.icon size={16} />
                    {item.label}
                    {item.badge && (
                      <span
                        className="ml-auto text-xs"
                        style={{
                          color: "var(--color-text-tertiary)",
                          backgroundColor: "var(--color-bg-tertiary)",
                          borderRadius: "var(--radius-sm)",
                          padding: "1px 6px",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      ) : (
        <>{children}</>
      )}
    </div>
  );
}

const siteLinks = [
  { path: "", label: "Overview", icon: FileText },
  { path: "/pages", label: "Pages", icon: FileText },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/versions", label: "Versions", icon: GitBranch },
  { path: "/links", label: "Links", icon: LinkIcon },
  { path: "/access", label: "Access", icon: Shield, badge: "Soon" },
  { path: "/monetization", label: "Monetization", icon: DollarSign, badge: "Soon" },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/team", label: "Team", icon: Users },
];
