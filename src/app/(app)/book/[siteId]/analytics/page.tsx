"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, FileText, Search, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

interface AnalyticsData {
  pageviews: { date: string; count: number }[];
  topPages: { title: string; views: number }[];
  searches: { query: string; count: number }[];
  feedback: { page: string; helpful: number; notHelpful: number }[];
}

export default function AnalyticsPage() {
  const params = useParams<{ siteId: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/book/spaces/${params.siteId}/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.siteId, period]);

  const maxPV = data ? Math.max(...data.pageviews.map((p) => p.count), 1) : 1;
  const totalPV = data?.pageviews.reduce((sum, p) => sum + p.count, 0) ?? 0;

  return (
    <div className="mx-auto max-w-5xl py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          <BarChart3 size={24} />
          Analytics
        </h1>
        <div
          className="flex gap-1 p-0.5"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition"
              style={{
                backgroundColor: period === p ? "var(--color-bg-tertiary)" : "transparent",
                color: period === p ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              }}
            >
              {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : !data ? (
        <div className="py-20 text-center" style={{ color: "var(--color-text-tertiary)" }}>
          Failed to load analytics
        </div>
      ) : (
        <div className="space-y-6">
          {/* Page Views Chart */}
          <div
            className="p-6"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Page Views
              </h2>
              <span className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {totalPV.toLocaleString()}
              </span>
            </div>
            <div className="flex h-32 items-end gap-[2px]">
              {data.pageviews.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                  No data yet
                </div>
              ) : (
                data.pageviews.map((pv) => (
                  <div
                    key={pv.date}
                    className="group relative flex-1 transition"
                    style={{
                      height: `${Math.max((pv.count / maxPV) * 100, 4)}%`,
                      backgroundColor: "var(--color-primary)",
                      opacity: 0.8,
                      borderRadius: "2px 2px 0 0",
                    }}
                    title={`${pv.date}: ${pv.count} views`}
                  />
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Pages */}
            <div
              className="p-6"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
              }}
            >
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                <FileText size={16} /> Top Pages
              </h2>
              {data.topPages.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>No data yet</p>
              ) : (
                <div className="space-y-2">
                  {data.topPages.map((page, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="mr-2 truncate text-sm" style={{ color: "var(--color-text-secondary)" }}>{page.title}</span>
                      <span className="shrink-0 text-sm font-medium" style={{ color: "var(--color-text-tertiary)" }}>{page.views}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Searches */}
            <div
              className="p-6"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
              }}
            >
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                <Search size={16} /> Recent Searches
              </h2>
              {data.searches.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>No searches yet</p>
              ) : (
                <div className="space-y-2">
                  {data.searches.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="mr-2 truncate text-sm" style={{ color: "var(--color-text-secondary)" }}>&ldquo;{s.query}&rdquo;</span>
                      <span className="shrink-0 text-sm font-medium" style={{ color: "var(--color-text-tertiary)" }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feedback */}
          <div
            className="p-6"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Feedback Summary
            </h2>
            {data.feedback.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>No feedback yet</p>
            ) : (
              <div className="space-y-2">
                {data.feedback.map((fb, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="mr-4 truncate text-sm" style={{ color: "var(--color-text-secondary)" }}>{fb.page}</span>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="flex items-center gap-1 text-sm" style={{ color: "var(--color-success)" }}>
                        <ThumbsUp size={14} /> {fb.helpful}
                      </span>
                      <span className="flex items-center gap-1 text-sm" style={{ color: "var(--color-error)" }}>
                        <ThumbsDown size={14} /> {fb.notHelpful}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
