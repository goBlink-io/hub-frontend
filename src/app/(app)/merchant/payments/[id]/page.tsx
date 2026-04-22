import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getMerchantAdminClient } from "@/lib/server/merchant-client";
import { formatCurrency, formatDate, getStatusColor, truncateAddress } from "@/lib/merchant/utils";
import { getExplorerTxUrl } from "@/lib/merchant/explorer";
import { getExchangeRate } from "@/lib/merchant/forex";
import { CopyButton } from "@/components/merchant/CopyButton";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  CreditCard,
  ExternalLink,
  ArrowDownToLine,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment Detail — Merchant" };
export const dynamic = "force-dynamic";

const statusTimeline = [
  { key: "pending", label: "Created", icon: Clock },
  { key: "processing", label: "Processing", icon: Loader2 },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
];

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const blink = await createClient();

  const { data: { user } } = await blink.auth.getUser();
  if (!user) redirect("/login");

  const merchantDb = getMerchantAdminClient();
  const { data: merchant } = await merchantDb
    .from("merchants")
    .select("id, display_currency")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!merchant) redirect("/merchant/onboarding");

  const { data: payment } = await merchantDb
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  if (!payment) notFound();

  const dc = merchant.display_currency || "USD";
  const rate = (await getExchangeRate(dc)) ?? 1;
  const showDc = dc !== "USD";

  function fmtDc(amountUsd: number): string {
    if (!showDc) return formatCurrency(amountUsd, "USD");
    return formatCurrency(amountUsd * rate, dc);
  }

  function fmtUsdSub(amountUsd: number): string | null {
    if (!showDc) return null;
    return formatCurrency(amountUsd, "USD");
  }

  const { data: refunds } = await merchantDb
    .from("refunds")
    .select("*")
    .eq("payment_id", payment.id)
    .order("created_at", { ascending: false });

  const statusIndex = (() => {
    switch (payment.status) {
      case "pending": return 0;
      case "processing": return 1;
      case "confirmed": return 2;
      case "failed":
      case "expired": return -1;
      case "refunded":
      case "partially_refunded": return 3;
      default: return 0;
    }
  })();

  return (
    <div className="space-y-6">
      {/* Test payment banner */}
      {payment.is_test && (
        <div
          className="px-4 py-2.5 rounded-xl text-center"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-warning)" }}>
            TEST PAYMENT — This payment was created with a test API key
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/merchant/payments"
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--color-text-secondary)", minHeight: "44px", minWidth: "44px" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {payment.external_order_id || `Payment #${payment.id.slice(0, 8)}`}
            </h1>
            {payment.is_test && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
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
          <p className="text-sm mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            Created {formatDate(payment.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Details Card */}
          <Card title="Payment Details" icon={CreditCard}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Amount</p>
                <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>{fmtDc(Number(payment.amount))}</p>
                {fmtUsdSub(Number(payment.amount)) && (
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{fmtUsdSub(Number(payment.amount))}</p>
                )}
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Net Amount</p>
                <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                  {payment.net_amount ? fmtDc(Number(payment.net_amount)) : "--"}
                </p>
                {payment.net_amount && fmtUsdSub(Number(payment.net_amount)) && (
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{fmtUsdSub(Number(payment.net_amount))}</p>
                )}
              </div>
              <DetailItem
                label="Fee"
                value={payment.fee_amount ? `${payment.fee_amount} ${payment.fee_currency || payment.currency}` : "--"}
              />
              <DetailItem label="Currency" value={showDc ? `${dc} (internal: ${payment.currency})` : payment.currency} />
            </div>

            {payment.crypto_amount && (
              <>
                <div className="my-4" style={{ borderTop: "1px solid var(--color-border)" }} />
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Crypto Amount" value={`${payment.crypto_amount} ${payment.crypto_token || ""}`} />
                  <DetailItem label="Chain" value={payment.crypto_chain || "--"} />
                </div>
              </>
            )}

            {(payment.send_tx_hash || payment.fulfillment_tx_hash) && (
              <>
                <div className="my-4" style={{ borderTop: "1px solid var(--color-border)" }} />
                <div className="space-y-3">
                  {payment.send_tx_hash && (
                    <TxHashItem label="Send TX Hash" txHash={payment.send_tx_hash} chain={payment.customer_chain} />
                  )}
                  {payment.fulfillment_tx_hash && (
                    <TxHashItem label="Fulfillment TX Hash" txHash={payment.fulfillment_tx_hash} chain={payment.crypto_chain} />
                  )}
                </div>
              </>
            )}
          </Card>

          {/* Customer Info */}
          {(payment.customer_wallet || payment.customer_chain) && (
            <Card title="Customer">
              <div className="grid grid-cols-2 gap-4">
                {payment.customer_wallet && (
                  <DetailItem
                    label="Wallet"
                    value={truncateAddress(payment.customer_wallet, 10)}
                    copyValue={payment.customer_wallet}
                    isHash
                  />
                )}
                <DetailItem label="Source Chain" value={payment.customer_chain || "--"} />
                <DetailItem label="Source Token" value={payment.customer_token || "--"} />
              </div>
            </Card>
          )}

          {/* Refunds */}
          {refunds && refunds.length > 0 && (
            <Card title="Refunds">
              <div className="space-y-3">
                {refunds.map((refund: Record<string, unknown>) => (
                  <div
                    key={refund.id as string}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: "var(--color-bg-tertiary)" }}
                  >
                    <div>
                      <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                        {formatCurrency(Number(refund.amount), payment.currency)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                        {formatDate(refund.created_at as string)}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${getStatusColor(refund.status as string)}`}>
                      {refund.status as string}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Metadata */}
          {payment.metadata && Object.keys(payment.metadata).length > 0 && (
            <Card title="Metadata">
              <pre
                className="text-sm rounded-lg p-4 overflow-x-auto font-mono"
                style={{
                  backgroundColor: "var(--color-bg-tertiary)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {JSON.stringify(payment.metadata, null, 2)}
              </pre>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <Card title="Status Timeline">
            <div className="space-y-4">
              {payment.status === "failed" || payment.status === "expired" ? (
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
                  >
                    <XCircle className="h-4 w-4" style={{ color: "var(--color-error)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize" style={{ color: "var(--color-error)" }}>
                      {payment.status}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {formatDate(payment.updated_at)}
                    </p>
                  </div>
                </div>
              ) : (
                statusTimeline.map((step, i) => {
                  const isComplete = i <= statusIndex;
                  const isCurrent = i === statusIndex;
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: isComplete ? "rgba(99,102,241,0.1)" : "var(--color-bg-tertiary)",
                        }}
                      >
                        <step.icon
                          className={`h-4 w-4 ${isCurrent && step.key === "processing" ? "animate-spin" : ""}`}
                          style={{ color: isComplete ? "var(--color-primary)" : "var(--color-text-tertiary)" }}
                        />
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: isComplete ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}
                        >
                          {step.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                            {step.key === "confirmed" && payment.confirmed_at
                              ? formatDate(payment.confirmed_at)
                              : formatDate(payment.updated_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {(payment.status === "refunded" || payment.status === "partially_refunded") && (
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(168,85,247,0.1)" }}
                  >
                    <CheckCircle2 className="h-4 w-4" style={{ color: "rgb(168,85,247)" }} />
                  </div>
                  <p className="text-sm font-medium capitalize" style={{ color: "rgb(168,85,247)" }}>
                    {payment.status.replace("_", " ")}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Settlement */}
          {payment.settlement_status && payment.settlement_status !== "none" && (
            <Card
              title="Settlement"
              icon={ArrowDownToLine}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Status</p>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{
                      backgroundColor:
                        payment.settlement_status === "settled" ? "rgba(34,197,94,0.1)" :
                        payment.settlement_status === "failed" ? "rgba(239,68,68,0.1)" :
                        "rgba(99,102,241,0.1)",
                      color:
                        payment.settlement_status === "settled" ? "var(--color-success)" :
                        payment.settlement_status === "failed" ? "var(--color-error)" :
                        "var(--color-primary)",
                    }}
                  >
                    {payment.settlement_status}
                  </span>
                </div>
                {payment.settlement_chain && <DetailItem label="Settlement Chain" value={payment.settlement_chain} />}
                {payment.settlement_token && <DetailItem label="Settlement Token" value={payment.settlement_token} />}
                {payment.intent_id && (
                  <DetailItem
                    label="Intent ID"
                    value={truncateAddress(payment.intent_id, 10)}
                    copyValue={payment.intent_id}
                    isHash
                  />
                )}
                {payment.settled_at && <DetailItem label="Settled At" value={formatDate(payment.settled_at)} />}
              </div>
            </Card>
          )}

          {/* Quick Info */}
          <Card title="Details">
            <div className="space-y-3">
              <DetailItem label="Payment ID" value={payment.id} copyValue={payment.id} isHash />
              {payment.external_order_id && <DetailItem label="Order ID" value={payment.external_order_id} />}
              {payment.deposit_address && (
                <DetailItem
                  label="Deposit Address"
                  value={truncateAddress(payment.deposit_address, 10)}
                  copyValue={payment.deposit_address}
                  isHash
                />
              )}
              {payment.return_url && <DetailItem label="Return URL" value={payment.return_url} />}
              {payment.expires_at && <DetailItem label="Expires" value={formatDate(payment.expires_at)} />}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared UI ─── */

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="p-5 pb-3">
        <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
          {Icon && <span style={{ color: "var(--color-text-tertiary)" }}><Icon className="h-4 w-4" /></span>}
          {title}
        </h3>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  copyValue,
  isHash,
}: {
  label: string;
  value: string;
  copyValue?: string;
  isHash?: boolean;
}) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-sm ${isHash ? "font-mono" : ""}`} style={{ color: "var(--color-text-primary)" }}>
          {value}
        </p>
        {copyValue && <CopyButton value={copyValue} />}
      </div>
    </div>
  );
}

function TxHashItem({
  label,
  txHash,
  chain,
}: {
  label: string;
  txHash: string;
  chain: string | null;
}) {
  const explorerUrl = chain ? getExplorerTxUrl(chain, txHash) : null;

  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-mono" style={{ color: "var(--color-text-primary)" }}>
          {truncateAddress(txHash, 10)}
        </p>
        <CopyButton value={txHash} />
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: "var(--color-primary)" }}
            title="View on explorer"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
