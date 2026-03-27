"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor, formatConverted } from "@/lib/merchant/utils";
import { Search, ChevronLeft, ChevronRight, CreditCard, Share2 } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useMerchantTestModeContext } from "@/contexts/MerchantTestModeContext";
import {
  useMerchantRealtimePayments,
  type RealtimePaymentRecord,
} from "@/hooks/useMerchantRealtimePayments";

interface Payment {
  id: string;
  external_order_id: string | null;
  amount: number;
  currency: string;
  crypto_amount: string | null;
  crypto_token: string | null;
  crypto_chain: string | null;
  status: string;
  customer_wallet: string | null;
  send_tx_hash: string | null;
  payment_url: string | null;
  created_at: string;
  is_test?: boolean;
}

interface PaymentsListProps {
  payments: Payment[];
  totalCount: number;
  currentPage: number;
  perPage: number;
  currency: string;
  displayCurrency: string;
  exchangeRate: number;
  currentStatus: string;
  currentSearch: string;
  merchantId: string;
}

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "confirmed", label: "Confirmed" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
  { value: "refunded", label: "Refunded" },
];

export function PaymentsList({
  payments,
  totalCount,
  currentPage,
  perPage,
  displayCurrency,
  exchangeRate,
  currentStatus,
  currentSearch,
  merchantId,
}: PaymentsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);
  const { isTestMode } = useMerchantTestModeContext();
  const [livePayments, setLivePayments] = useState<Payment[]>(payments);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const highlightTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setLivePayments(payments);
  }, [payments]);

  const handleInsert = useCallback(
    (record: RealtimePaymentRecord) => {
      if (Boolean(record.is_test) !== isTestMode) return;
      if (currentPage !== 1) return;
      if (currentStatus !== "all" && record.status !== currentStatus) return;

      const newPayment: Payment = {
        id: record.id as string,
        external_order_id: (record.external_order_id as string) ?? null,
        amount: Number(record.amount),
        currency: (record.currency as string) ?? "USD",
        crypto_amount: (record.crypto_amount as string) ?? null,
        crypto_token: (record.crypto_token as string) ?? null,
        crypto_chain: (record.crypto_chain as string) ?? null,
        status: (record.status as string) ?? "pending",
        customer_wallet: (record.customer_wallet as string) ?? null,
        send_tx_hash: (record.send_tx_hash as string) ?? null,
        payment_url: (record.payment_url as string) ?? null,
        created_at: (record.created_at as string) ?? new Date().toISOString(),
        is_test: Boolean(record.is_test),
      };

      setLivePayments((prev) => [newPayment, ...prev].slice(0, perPage));

      setHighlightedIds((prev) => new Set(prev).add(record.id as string));
      const timer = setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev);
          next.delete(record.id as string);
          return next;
        });
        highlightTimers.current.delete(record.id as string);
      }, 2000);
      highlightTimers.current.set(record.id as string, timer);
    },
    [isTestMode, currentPage, currentStatus, perPage]
  );

  const handleUpdate = useCallback(
    (record: RealtimePaymentRecord) => {
      setLivePayments((prev) =>
        prev.map((p) =>
          p.id === record.id
            ? {
                ...p,
                status: (record.status as string) ?? p.status,
                crypto_amount: (record.crypto_amount as string) ?? p.crypto_amount,
                crypto_token: (record.crypto_token as string) ?? p.crypto_token,
                crypto_chain: (record.crypto_chain as string) ?? p.crypto_chain,
                customer_wallet: (record.customer_wallet as string) ?? p.customer_wallet,
                send_tx_hash: (record.send_tx_hash as string) ?? p.send_tx_hash,
                payment_url: (record.payment_url as string) ?? p.payment_url,
              }
            : p
        )
      );
    },
    []
  );

  useMerchantRealtimePayments(merchantId, { onInsert: handleInsert, onUpdate: handleUpdate });

  useEffect(() => {
    const timers = highlightTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Sync test mode with URL
  const prevTestMode = useRef(isTestMode);
  useEffect(() => {
    if (prevTestMode.current === isTestMode) return;
    prevTestMode.current = isTestMode;
    const params = new URLSearchParams(searchParams.toString());
    if (isTestMode) {
      params.set("is_test", "true");
    } else {
      params.delete("is_test");
    }
    params.delete("page");
    router.push(`/merchant/payments?${params.toString()}`);
  }, [isTestMode, searchParams, router]);

  const totalPages = Math.ceil(totalCount / perPage);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all" && value !== "") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    if ("status" in updates || "search" in updates) {
      params.delete("page");
    }
    router.push(`/merchant/payments?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--color-text-tertiary)" }} />
          <input
            placeholder="Search by order ID or tx hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm"
            style={{
              backgroundColor: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              minHeight: "44px",
            }}
          />
        </form>
        <select
          value={currentStatus}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="rounded-lg px-3 py-2.5 text-sm"
          style={{
            backgroundColor: "var(--color-bg-tertiary)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
            minHeight: "44px",
            minWidth: "160px",
          }}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
        }}
      >
        {livePayments.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--color-text-tertiary)" }} />
            <h3 className="text-lg font-medium" style={{ color: "var(--color-text-secondary)" }}>No payments found</h3>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-tertiary)" }}>
              {currentSearch || currentStatus !== "all"
                ? "Try adjusting your filters."
                : "Payments will appear here once customers start paying."}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium uppercase tracking-wider"
              style={{
                borderBottom: "1px solid var(--color-border)",
                color: "var(--color-text-tertiary)",
              }}
            >
              <div className="col-span-3">Order</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Crypto</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1"></div>
            </div>

            {/* Rows */}
            {livePayments.map((payment) => (
              <div
                key={payment.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 items-center transition-all duration-700 cursor-pointer"
                style={{
                  borderBottom: "1px solid var(--color-border-subtle, rgba(255,255,255,0.05))",
                  minHeight: "44px",
                  ...(highlightedIds.has(payment.id)
                    ? {
                        boxShadow: "inset 0 0 0 1px rgba(34,197,94,0.4)",
                        backgroundColor: "rgba(34,197,94,0.05)",
                      }
                    : {}),
                }}
              >
                <Link href={`/merchant/payments/${payment.id}`} className="col-span-3">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                    {payment.external_order_id || `#${payment.id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs truncate md:hidden" style={{ color: "var(--color-text-tertiary)" }}>
                    {formatDate(payment.created_at)}
                  </p>
                </Link>
                <Link href={`/merchant/payments/${payment.id}`} className="col-span-2">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {formatConverted(Number(payment.amount), displayCurrency, exchangeRate)}
                  </span>
                  {displayCurrency !== "USD" && (
                    <span className="text-xs block" style={{ color: "var(--color-text-tertiary)" }}>
                      {formatCurrency(Number(payment.amount), "USD")}
                    </span>
                  )}
                </Link>
                <Link href={`/merchant/payments/${payment.id}`} className="col-span-2">
                  {payment.crypto_amount ? (
                    <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {payment.crypto_amount} {payment.crypto_token}
                    </span>
                  ) : (
                    <span className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>--</span>
                  )}
                </Link>
                <div className="col-span-2 flex items-center gap-1.5">
                  {payment.is_test && (
                    <span
                      className="text-[11px] font-medium px-1.5 py-0 rounded"
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
                </div>
                <div className="col-span-2 hidden md:block">
                  <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {formatDate(payment.created_at)}
                  </span>
                </div>
                <div className="col-span-1 hidden md:flex justify-end">
                  {(payment.status === "pending" || payment.status === "processing") &&
                    payment.payment_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(payment.payment_url!);
                        }}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: "var(--color-text-tertiary)" }}
                        title="Copy payment link"
                        aria-label="Copy payment link"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            Showing {(currentPage - 1) * perPage + 1}–
            {Math.min(currentPage * perPage, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => updateParams({ page: String(currentPage - 1) })}
              className="p-2 rounded-lg disabled:opacity-30"
              aria-label="Previous page"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                minHeight: "44px",
                minWidth: "44px",
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => updateParams({ page: String(currentPage + 1) })}
              className="p-2 rounded-lg disabled:opacity-30"
              aria-label="Next page"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                minHeight: "44px",
                minWidth: "44px",
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
