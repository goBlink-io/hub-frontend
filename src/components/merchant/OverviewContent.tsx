"use client";

import { useMerchantTestModeContext } from "@/contexts/MerchantTestModeContext";
import { useEffect, useState, useCallback } from "react";
import { formatCurrency, formatDate, getStatusColor, formatConverted } from "@/lib/merchant/utils";
import {
  useMerchantRealtimePayments,
  type ConnectionStatus,
  type RealtimePaymentRecord,
} from "@/hooks/useMerchantRealtimePayments";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CreditCard,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface OverviewData {
  totalBalance: number;
  todayRevenue: number;
  pendingCount: number;
  totalPayments: number;
  recentPayments: Array<{
    id: string;
    external_order_id: string | null;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    is_test: boolean;
  }>;
  currency: string;
  displayCurrency: string;
  exchangeRate: number;
  settlementToken: string;
  settlementChain: string;
  businessName: string;
  onboardingChecklist?: {
    account_created: boolean;
    wallet_connected: boolean;
    settlement_configured: boolean;
    first_link_created: boolean;
    test_payment_completed: boolean;
    webhook_configured: boolean;
  } | null;
  firstPaymentCelebrated?: boolean;
  merchantId?: string;
}

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--color-success)" }}>
        <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-success)" }} />
        Live
      </span>
    );
  }
  if (status === "reconnecting") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--color-warning)" }}>
        <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-warning)" }} />
        Reconnecting
      </span>
    );
  }
  return null;
}

function UsdSecondary({ amountUsd, displayCurrency }: { amountUsd: number; displayCurrency: string }) {
  if (displayCurrency === "USD") return null;
  return (
    <span className="text-xs ml-1" style={{ color: "var(--color-text-tertiary)" }}>
      ({formatCurrency(amountUsd, "USD")})
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
          {title}
        </span>
        <span style={{ color: "var(--color-text-tertiary)" }}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
      </div>
      {subtitle && (
        <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function OverviewContent({ data }: { data: OverviewData }) {
  const { isTestMode } = useMerchantTestModeContext();
  const [filtered, setFiltered] = useState<OverviewData>(data);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/merchant/overview?is_test=${isTestMode}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) setFiltered(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isTestMode]);

  const handleInsert = useCallback(
    (record: RealtimePaymentRecord) => {
      if (Boolean(record.is_test) !== isTestMode) return;

      setFiltered((prev) => ({
        ...prev,
        totalPayments: record.status === "confirmed" ? prev.totalPayments + 1 : prev.totalPayments,
        todayRevenue: record.status === "confirmed" ? prev.todayRevenue + Number(record.amount) : prev.todayRevenue,
        pendingCount:
          record.status === "pending" || record.status === "processing"
            ? prev.pendingCount + 1
            : prev.pendingCount,
        recentPayments: [
          {
            id: record.id as string,
            external_order_id: (record.external_order_id as string) ?? null,
            amount: Number(record.amount),
            currency: (record.currency as string) ?? "USD",
            status: (record.status as string) ?? "pending",
            created_at: (record.created_at as string) ?? new Date().toISOString(),
            is_test: Boolean(record.is_test),
          },
          ...prev.recentPayments.slice(0, 7),
        ],
      }));
    },
    [isTestMode]
  );

  const handleUpdate = useCallback(
    (record: RealtimePaymentRecord) => {
      if (Boolean(record.is_test) !== isTestMode) return;
      setFiltered((prev) => ({
        ...prev,
        recentPayments: prev.recentPayments.map((p) =>
          p.id === record.id ? { ...p, status: (record.status as string) ?? p.status } : p
        ),
      }));
    },
    [isTestMode]
  );

  const { connectionStatus } = useMerchantRealtimePayments(filtered.merchantId, {
    onInsert: handleInsert,
    onUpdate: handleUpdate,
  });

  const dc = filtered.displayCurrency || "USD";
  const rate = filtered.exchangeRate || 1;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Welcome back, {filtered.businessName}
          </h1>
          <ConnectionIndicator status={connectionStatus} />
        </div>
        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Accept crypto from any chain. Settle instantly to your wallet.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Balance"
          value={formatConverted(filtered.totalBalance, dc, rate)}
          subtitle={`${filtered.settlementToken} on ${filtered.settlementChain}`}
          icon={DollarSign}
          loading={loading}
        />
        <StatCard
          title="Today's Revenue"
          value={formatConverted(filtered.todayRevenue, dc, rate)}
          subtitle="Confirmed payments today"
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="Pending"
          value={filtered.pendingCount ?? 0}
          subtitle="Payments in progress"
          icon={Clock}
          loading={loading}
        />
        <StatCard
          title="Total Payments"
          value={filtered.totalPayments}
          subtitle="All time confirmed"
          icon={CreditCard}
          loading={loading}
        />
      </div>

      {/* Recent Payments */}
      <div
        className="rounded-xl"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Recent Payments
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
              Your latest transactions
            </p>
          </div>
          <Link
            href="/merchant/payments"
            className="text-sm font-medium"
            style={{ color: "var(--color-primary)" }}
          >
            View all
          </Link>
        </div>

        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
            </div>
          ) : !filtered.recentPayments || filtered.recentPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--color-text-tertiary)" }} />
              <h3 className="text-lg font-medium" style={{ color: "var(--color-text-secondary)" }}>
                No {isTestMode ? "test " : ""}payments yet
              </h3>
              <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: "var(--color-text-tertiary)" }}>
                {isTestMode
                  ? "Create a test payment using a gb_test_ API key to see it here."
                  : "Payments will appear here once your first customer pays."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.recentPayments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/merchant/payments/${payment.id}`}
                  className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors"
                  style={{ minHeight: "44px" }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                        {payment.external_order_id || payment.id.slice(0, 8)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                        {formatDate(payment.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {payment.is_test && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0 rounded"
                        style={{
                          backgroundColor: "rgba(245, 158, 11, 0.1)",
                          color: "var(--color-warning)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                        }}
                      >
                        Test
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {formatConverted(Number(payment.amount), dc, rate)}
                      <UsdSecondary amountUsd={Number(payment.amount)} displayCurrency={dc} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
