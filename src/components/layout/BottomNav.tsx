"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  PieChart,
  CreditCard,
  MoreHorizontal,
  Store,
  BookOpen,
  Settings,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const mainItems: NavItem[] = [
  { href: "/swap", label: "Swap", icon: <ArrowLeftRight size={20} /> },
  { href: "/portfolio", label: "Portfolio", icon: <PieChart size={20} /> },
  { href: "/pay", label: "Pay", icon: <CreditCard size={20} /> },
];

const moreItems: NavItem[] = [
  { href: "/merchant", label: "Merchant", icon: <Store size={20} /> },
  { href: "/book", label: "BlinkBook", icon: <BookOpen size={20} /> },
  { href: "/settings", label: "Settings", icon: <Settings size={20} /> },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isMoreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 md:hidden"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: "var(--z-modal-backdrop)",
          }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu */}
      {moreOpen && (
        <div
          className="fixed bottom-20 right-4 md:hidden"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            zIndex: "var(--z-modal)",
            minWidth: "180px",
          }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              More
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-bg-tertiary)" }}
              aria-label="Close menu"
            >
              <X size={12} style={{ color: "var(--color-text-secondary)" }} />
            </button>
          </div>
          {moreItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors"
              style={{
                color: isActive(item.href)
                  ? "var(--color-primary)"
                  : "var(--color-text-secondary)",
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden safe-area-bottom"
        style={{
          backgroundColor: "rgba(10, 11, 15, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid var(--color-border)",
          zIndex: "var(--z-nav)",
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {mainItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2"
                style={{
                  color: active
                    ? "var(--color-primary)"
                    : "var(--color-text-muted)",
                  minHeight: "44px",
                }}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <div
                    className="absolute top-0 h-0.5 w-8 rounded-b-full"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                )}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2"
            style={{
              color: isMoreActive || moreOpen
                ? "var(--color-primary)"
                : "var(--color-text-muted)",
              minHeight: "44px",
            }}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
