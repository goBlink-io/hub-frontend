import { PieChart } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div
        className="flex flex-col items-center justify-center gap-4 py-20"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <PieChart size={48} style={{ color: "var(--color-primary)" }} />
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Portfolio
        </h1>
        <p
          className="text-sm text-center max-w-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Multi-chain portfolio view. Track tokens, NFTs, and activity across
          all connected wallets.
        </p>
        <span
          className="text-xs font-medium px-3 py-1"
          style={{
            color: "var(--color-warning)",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          Coming Soon
        </span>
      </div>
    </div>
  );
}
