import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuditHero } from "@/components/audit/AuditHero";
import { StatsStrip } from "@/components/audit/StatsStrip";
import { RecentAudits } from "@/components/audit/RecentAudits";
import { getStats, ZionError } from "@/lib/server/zion";
import { logger } from "@/lib/logger";
import type { ZionStats } from "@/types/audit";

export const metadata: Metadata = {
  title: "Audit",
};

/** Revalidate stats at most every 5 minutes. */
export const revalidate = 300;

async function safeStats(): Promise<ZionStats | null> {
  try {
    return await getStats();
  } catch (err) {
    if (err instanceof ZionError) {
      logger.warn("[audit/landing] prover call failed", {
        status: err.status,
        code: err.code,
      });
    } else {
      logger.error("[audit/landing] unexpected error", err);
    }
    return null;
  }
}

export default async function AuditLandingPage() {
  const stats = await safeStats();

  return (
    <div className="space-y-8 pb-6">
      <AuditHero />
      <StatsStrip stats={stats} />
      <RecentAudits />
      <section className="px-4">
        <div
          className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-3 p-5"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div>
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Ready to audit a contract?
            </h2>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Upload source files or point us at a public GitHub repo.
            </p>
          </div>
          <Link
            href="/audit/new"
            className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
            }}
          >
            Start audit
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
