"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { ConnectButton } from "@goblink/connect/react";
import {
  ArrowLeftRight,
  PieChart,
  CreditCard,
  Store,
  BookOpen,
  Clock,
  Shield,
  ChevronDown,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState, useRef, useEffect } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const primaryNavItems: NavItem[] = [
  { href: "/swap", label: "Swap", icon: <ArrowLeftRight size={16} /> },
  { href: "/portfolio", label: "Portfolio", icon: <PieChart size={16} /> },
  { href: "/pay", label: "Pay", icon: <CreditCard size={16} /> },
  { href: "/history", label: "History", icon: <Clock size={16} /> },
];

const productNavItems: NavItem[] = [
  { href: "/merchant", label: "Merchant", icon: <Store size={16} /> },
  { href: "/book", label: "Book", icon: <BookOpen size={16} /> },
  { href: "/audit", label: "Audit", icon: <Shield size={16} /> },
];

export function Navbar() {
  const pathname = usePathname();
  const [productsOpen, setProductsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isProductActive = productNavItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 safe-area-top"
      style={{
        backgroundColor: "rgba(10, 11, 15, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border)",
        zIndex: "var(--z-nav)",
      }}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Logo size="md" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {primaryNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-150"
                style={{
                  color: isActive
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                  backgroundColor: isActive
                    ? "var(--color-bg-tertiary)"
                    : "transparent",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}

          {/* Products dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProductsOpen(!productsOpen)}
              onMouseEnter={() => setProductsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150"
              style={{
                color: isProductActive
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                backgroundColor: isProductActive || productsOpen
                  ? "var(--color-bg-tertiary)"
                  : "transparent",
                borderRadius: "var(--radius-md)",
              }}
            >
              Products
              <ChevronDown
                size={14}
                className="transition-transform duration-150"
                style={{
                  transform: productsOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
            {productsOpen && (
              <div
                className="absolute top-full left-0 mt-1 py-1 min-w-[180px]"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                  zIndex: 50,
                }}
                onMouseLeave={() => setProductsOpen(false)}
              >
                {productNavItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setProductsOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors"
                      style={{
                        color: isActive
                          ? "var(--color-primary)"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Connect button */}
        <div className="flex items-center">
          <ConnectButton theme="dark" />
        </div>
      </nav>
    </header>
  );
}
