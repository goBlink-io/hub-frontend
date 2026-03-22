"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  RotateCcw,
  Link2,
  FileText,
  Store,
  Code,
  Plug,
  Activity,
  Download,
  Landmark,
  Wallet,
  Settings,
  LifeBuoy,
  Users,
  FlaskConical,
} from "lucide-react";
import { useMerchantTestModeContext } from "@/contexts/MerchantTestModeContext";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}

const navItems: NavItem[] = [
  { title: "Overview", href: "/merchant", icon: LayoutDashboard },
  { title: "Payments", href: "/merchant/payments", icon: CreditCard },
  { title: "Refunds", href: "/merchant/refunds", icon: RotateCcw },
  { title: "Links", href: "/merchant/links", icon: Link2 },
  { title: "Invoices", href: "/merchant/invoices", icon: FileText },
  { title: "POS", href: "/merchant/pos", icon: Store },
  { title: "Buttons", href: "/merchant/buttons", icon: Code },
  { title: "Webhooks", href: "/merchant/webhooks", icon: Plug },
  { title: "Activity", href: "/merchant/activity", icon: Activity },
  { title: "Export", href: "/merchant/export", icon: Download },
  { title: "Cash Out", href: "/merchant/offramp", icon: Landmark, comingSoon: true },
  { title: "Settlement", href: "/merchant/settings/settlement", icon: Wallet },
  { title: "Settings", href: "/merchant/settings", icon: Settings },
  { title: "Support", href: "/merchant/support", icon: LifeBuoy },
  { title: "Referrals", href: "/merchant/referrals", icon: Users },
];

export function MerchantNav() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isTestMode, toggleTestMode } = useMerchantTestModeContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector("[data-active=true]");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [pathname]);

  function isActive(href: string): boolean {
    if (href === "/merchant") return pathname === "/merchant";
    return pathname.startsWith(href);
  }

  return (
    <div
      className="sticky top-16 z-20"
      style={{
        backgroundColor: "var(--color-bg-primary)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center gap-3">
          {/* Scrollable tabs */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <nav className="flex items-center gap-1 py-2" style={{ minWidth: "max-content" }}>
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-active={active}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: active ? "var(--color-primary-alpha, rgba(99,102,241,0.1))" : "transparent",
                      color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                      minHeight: "44px",
                      opacity: item.comingSoon ? 0.5 : 1,
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Test mode toggle */}
          {mounted && (
            <button
              onClick={toggleTestMode}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
              style={{
                backgroundColor: isTestMode ? "rgba(245, 158, 11, 0.1)" : "transparent",
                color: isTestMode ? "var(--color-warning)" : "var(--color-text-tertiary)",
                border: isTestMode ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid transparent",
                minHeight: "44px",
              }}
            >
              <FlaskConical className="h-4 w-4" />
              <span className="hidden md:inline">{isTestMode ? "Test" : "Live"}</span>
              <span
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                style={{ backgroundColor: isTestMode ? "var(--color-warning)" : "var(--color-text-tertiary)" }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                  style={{ transform: isTestMode ? "translateX(16px)" : "translateX(4px)" }}
                />
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
