"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  Send,
  LinkIcon,
  Wallet,
  Store,
  BookOpen,
  Code,
} from "lucide-react";
import { useWallet } from "@goblink/connect/react";

interface DashboardContentProps {
  userEmail: string | null;
}

interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface ProductCard {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  tag: string;
}

const quickActions: QuickAction[] = [
  {
    href: "/swap",
    label: "Swap",
    description: "Cross-chain token swap",
    icon: <ArrowLeftRight size={24} />,
  },
  {
    href: "/pay",
    label: "Send",
    description: "Send to any address",
    icon: <Send size={24} />,
  },
  {
    href: "/pay",
    label: "Payment Link",
    description: "Create a pay link",
    icon: <LinkIcon size={24} />,
  },
];

const products: ProductCard[] = [
  {
    href: "/merchant",
    label: "Merchant Tools",
    description:
      "Accept crypto payments for your business. POS, invoices, embeddable buttons, and webhooks.",
    icon: <Store size={24} />,
    tag: "Business",
  },
  {
    href: "/book",
    label: "BlinkBook",
    description:
      "Host beautiful documentation sites. Block editor, custom domains, analytics.",
    icon: <BookOpen size={24} />,
    tag: "Docs",
  },
  {
    href: "/settings",
    label: "SDK & API",
    description:
      "Integrate goBlink into your app. Cross-chain swaps, payments, and wallet connections.",
    icon: <Code size={24} />,
    tag: "Developer",
  },
];

export function DashboardContent({ userEmail }: DashboardContentProps) {
  const { wallets, isConnected, address } = useWallet();

  const displayName = userEmail?.split("@")[0] ?? address?.slice(0, 8) ?? "anon";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-8">
      {/* Welcome */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Welcome back, {displayName}
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Your cross-chain command center
        </p>
      </div>

      {/* Quick Actions */}
      <section className="space-y-3">
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 text-center transition-colors"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                color: "var(--color-primary)",
                minHeight: "44px",
              }}
            >
              {action.icon}
              <span
                className="text-sm font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                {action.label}
              </span>
              <span
                className="text-xs hidden sm:block"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {action.description}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Connected Wallets */}
      <section className="space-y-3">
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Connected Wallets
        </h2>
        {isConnected && wallets.length > 0 ? (
          <div className="space-y-2">
            {wallets.map((w) => (
              <div
                key={`${w.chain}-${w.address}`}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <Wallet
                  size={18}
                  style={{ color: "var(--color-primary)" }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium capitalize"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {w.chain}
                  </p>
                  <p
                    className="text-xs truncate font-mono"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {w.address}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center gap-2 py-8"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px dashed var(--color-border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <Wallet
              size={32}
              style={{ color: "var(--color-text-muted)" }}
            />
            <p
              className="text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              No wallets connected yet
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              Connect a wallet to get started with cross-chain features
            </p>
          </div>
        )}
      </section>

      {/* Products */}
      <section className="space-y-3">
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Products
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.label}
              href={product.href}
              className="flex flex-col gap-3 p-5 transition-colors group"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <div className="flex items-center justify-between">
                <div style={{ color: "var(--color-primary)" }}>
                  {product.icon}
                </div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
                  style={{
                    color: "var(--color-text-muted)",
                    backgroundColor: "var(--color-bg-tertiary)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {product.tag}
                </span>
              </div>
              <div>
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {product.label}
                </h3>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {product.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
