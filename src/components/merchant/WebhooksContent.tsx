"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/merchant/CopyButton";
import {
  Webhook,
  Plus,
  Trash2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  Play,
  X,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { formatDate } from "@/lib/merchant/utils";

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface DeliveryRow {
  id: string;
  webhook_endpoint_id: string;
  event: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  attempt: number;
  delivered_at: string | null;
  created_at: string;
  webhook_endpoints?: {
    id: string;
    url: string;
    events: string[];
  };
}

interface WebhooksContentProps {
  merchantId: string;
  webhooks: WebhookEndpoint[];
}

const EVENT_OPTIONS = [
  "payment.created",
  "payment.processing",
  "payment.confirmed",
  "payment.failed",
  "payment.expired",
  "payment.refunded",
  "payment.partially_refunded",
];

export function WebhooksContent({ merchantId, webhooks }: WebhooksContentProps) {
  return (
    <div className="space-y-8">
      <EndpointsSection merchantId={merchantId} webhooks={webhooks} />
      <div style={{ borderTop: "1px solid var(--color-border)" }} />
      <DeliveryLogsSection webhooks={webhooks} />
    </div>
  );
}

/* ─── Endpoints Section ─── */

function EndpointsSection({
  merchantId,
  webhooks,
}: {
  merchantId: string;
  webhooks: WebhookEndpoint[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["payment.confirmed"]);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    delivered: boolean;
    status: number | null;
    body: string | null;
  } | null>(null);
  const router = useRouter();

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/merchant/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, url, events: selectedEvents }),
      });
      if (res.ok) {
        setUrl("");
        setSelectedEvents(["payment.confirmed"]);
        setDialogOpen(false);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(webhookId: string) {
    if (!confirm("Delete this webhook endpoint? This cannot be undone.")) return;
    const res = await fetch("/api/merchant/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookId, merchantId }),
    });
    if (res.ok) router.refresh();
  }

  async function handleTest(webhookId: string) {
    setTesting(webhookId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/merchant/webhooks/${webhookId}/test`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          id: webhookId,
          delivered: data.delivered,
          status: data.responseStatus,
          body: data.responseBody,
        });
      }
    } finally {
      setTesting(null);
    }
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  return (
    <div
      className="rounded-xl"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between p-5 pb-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
            <Webhook className="h-5 w-5" style={{ color: "var(--color-text-tertiary)" }} />
            Endpoints
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            Registered URLs that receive event notifications via HTTP POST.
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "white",
            minHeight: "44px",
          }}
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

      <div className="px-5 pb-5">
        {webhooks.length === 0 ? (
          <div className="text-center py-8">
            <Webhook className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No webhook endpoints</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
              Add an endpoint to receive real-time payment notifications.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="rounded-lg p-4 space-y-3"
                style={{
                  backgroundColor: "var(--color-bg-tertiary)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono truncate max-w-[400px] block" style={{ color: "var(--color-text-primary)" }}>
                        {wh.url}
                      </code>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: wh.is_active ? "rgba(34,197,94,0.1)" : "rgba(161,161,170,0.1)",
                          color: wh.is_active ? "var(--color-success)" : "var(--color-text-tertiary)",
                          border: `1px solid ${wh.is_active ? "rgba(34,197,94,0.2)" : "rgba(161,161,170,0.2)"}`,
                        }}
                      >
                        {wh.is_active ? "active" : "inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {wh.events.map((event) => (
                        <span
                          key={event}
                          className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: "rgba(99,102,241,0.1)",
                            color: "var(--color-primary)",
                            border: "1px solid rgba(99,102,241,0.2)",
                          }}
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      Created {formatDate(wh.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleTest(wh.id)}
                      disabled={testing === wh.id}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: "var(--color-text-tertiary)", minHeight: "44px", minWidth: "44px" }}
                      title="Send test event"
                      aria-label="Send test event"
                    >
                      {testing === wh.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(wh.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: "var(--color-text-tertiary)", minHeight: "44px", minWidth: "44px" }}
                      title="Delete endpoint"
                      aria-label="Delete endpoint"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {testResult?.id === wh.id && (
                  <div
                    className="text-xs px-3 py-2 rounded-md"
                    style={{
                      backgroundColor: testResult.delivered ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      color: testResult.delivered ? "var(--color-success)" : "var(--color-error)",
                    }}
                  >
                    Test {testResult.delivered ? "delivered" : "failed"}
                    {testResult.status ? ` (${testResult.status})` : ""}
                    {testResult.body && (
                      <pre className="mt-1 text-xs opacity-75 truncate">
                        {testResult.body.slice(0, 200)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add webhook modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div
            className="w-full max-w-md rounded-xl p-6 space-y-4"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Add Webhook Endpoint
              </h3>
              <button onClick={() => setDialogOpen(false)} className="p-1" style={{ color: "var(--color-text-tertiary)" }} aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
              Payloads are signed with HMAC-SHA256. A signing secret will be auto-generated.
            </p>

            <div className="space-y-2">
              <label htmlFor="webhook-endpoint-url" className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Endpoint URL
              </label>
              <input
                id="webhook-endpoint-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks/goblink"
                type="url"
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{
                  backgroundColor: "var(--color-bg-tertiary)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  minHeight: "44px",
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Events
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_OPTIONS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                    style={{ color: "var(--color-text-secondary)", minHeight: "44px" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="rounded"
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                  minHeight: "44px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !url || selectedEvents.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  minHeight: "44px",
                }}
              >
                {creating ? "Creating..." : "Add Endpoint"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Delivery Logs Section ─── */

function DeliveryLogsSection({ webhooks }: { webhooks: WebhookEndpoint[] }) {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filterEvent, setFilterEvent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (filterEvent !== "all") params.set("event_type", filterEvent);
    if (filterStatus !== "all") params.set("status", filterStatus);

    try {
      const res = await fetch(`/api/merchant/webhooks/deliveries?${params}`);
      if (res.ok) {
        const json = await res.json();
        setDeliveries(json.data ?? []);
        setTotal(json.total ?? 0);
        setTotalPages(json.totalPages ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterEvent, filterStatus]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  useEffect(() => {
    setPage(1);
  }, [filterEvent, filterStatus]);

  async function handleRetry(deliveryId: string) {
    await fetch(`/api/merchant/webhooks/deliveries/${deliveryId}/retry`, {
      method: "POST",
    });
    fetchDeliveries();
  }

  const uniqueEvents = Array.from(new Set(webhooks.flatMap((w) => w.events))).sort();

  return (
    <div
      className="rounded-xl"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="p-5 pb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
          <Play className="h-5 w-5" style={{ color: "var(--color-text-tertiary)" }} />
          Delivery History
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
          All webhook delivery attempts.{total > 0 && ` (${total} total)`}
        </p>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="rounded-lg px-3 py-2.5 text-sm"
            style={{
              backgroundColor: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              minHeight: "44px",
            }}
          >
            <option value="all">All events</option>
            {uniqueEvents.map((event) => (
              <option key={event} value={event}>{event}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg px-3 py-2.5 text-sm"
            style={{
              backgroundColor: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              minHeight: "44px",
            }}
          >
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: "var(--color-bg-tertiary)" }} />
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-12">
            <Webhook className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No deliveries found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="rounded-lg p-3"
                style={{
                  backgroundColor: "var(--color-bg-tertiary)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <button
                  onClick={() => setExpandedId(expandedId === delivery.id ? null : delivery.id)}
                  className="w-full flex items-center justify-between text-left"
                  style={{ minHeight: "44px" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          delivery.response_status && delivery.response_status >= 200 && delivery.response_status < 300
                            ? "var(--color-success)"
                            : "var(--color-error)",
                      }}
                    />
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{
                      backgroundColor: "rgba(99,102,241,0.1)",
                      color: "var(--color-primary)",
                    }}>
                      {delivery.event}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {delivery.response_status ?? "—"} · Attempt {delivery.attempt}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {formatDate(delivery.created_at)}
                    </span>
                    <ChevronDown
                      className="h-4 w-4 transition-transform"
                      style={{
                        color: "var(--color-text-tertiary)",
                        transform: expandedId === delivery.id ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </div>
                </button>

                {expandedId === delivery.id && (
                  <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--color-border)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Delivery ID: {delivery.id}</span>
                      <button
                        onClick={() => handleRetry(delivery.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                        style={{ color: "var(--color-primary)" }}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </button>
                    </div>
                    {delivery.response_body && (
                      <pre
                        className="text-xs rounded-lg p-3 overflow-x-auto font-mono max-h-40"
                        style={{
                          backgroundColor: "var(--color-bg-primary)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {delivery.response_body.slice(0, 500)}
                      </pre>
                    )}
                    {delivery.payload && (
                      <details>
                        <summary className="text-xs cursor-pointer" style={{ color: "var(--color-text-tertiary)" }}>
                          Payload
                        </summary>
                        <pre
                          className="text-xs rounded-lg p-3 overflow-x-auto font-mono max-h-60 mt-1"
                          style={{
                            backgroundColor: "var(--color-bg-primary)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {JSON.stringify(delivery.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg disabled:opacity-30"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", minHeight: "44px" }}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg disabled:opacity-30"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", minHeight: "44px" }}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
