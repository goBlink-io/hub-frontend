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
import { Skeleton } from "@/components/ui/Skeleton";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import RecentTransfers from "@/components/swap/RecentTransfers";

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

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-8 animate-fade-up">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardContent({ userEmail }: DashboardContentProps) {
  const { wallets, isConnected, address } = useWallet();
  const { history } = useTransactionHistory();

  const displayName = userEmail?.split("@")[0] ?? address?.slice(0, 8) ?? "anon";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-blue-gradient">
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
              className="card-hero flex flex-col items-center gap-2 p-4 text-center cursor-pointer"
              style={{
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
                className="card-standard flex items-center gap-3 px-4 py-3"
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
              className="card-standard flex flex-col gap-3 p-5 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div style={{ color: "var(--color-primary)" }}>
                  {product.icon}
                </div>
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5"
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

      {/* Recent Activity */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Recent Activity
        </h2>
        <RecentTransfers history={history} onSelect={() => {}} />
      </section>
    </div>
  );
}

export { DashboardSkeleton };
