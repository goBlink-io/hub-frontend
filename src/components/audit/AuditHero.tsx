import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

export function AuditHero() {
  return (
    <section className="px-4 pt-10 pb-6 text-center">
      <div
        className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium"
        style={{
          color: "var(--color-primary)",
          backgroundColor: "var(--color-accent-glow)",
          borderRadius: "999px",
        }}
      >
        <ShieldCheck size={14} />
        Powered by Zion Prover
      </div>
      <h1
        className="text-3xl sm:text-4xl font-bold tracking-tight text-blue-gradient"
      >
        Prove your contract safe.
      </h1>
      <p
        className="mx-auto mt-3 max-w-xl text-sm sm:text-base"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Multi-chain smart contract audits with formal verification, generated
        tests, and pattern matching against real exploits. Get a scored report
        you can share.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/audit/new"
          className="inline-flex items-center gap-2 px-5 h-11 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
          }}
        >
          Start an audit
          <ArrowRight size={16} />
        </Link>
        <a
          href="#how-it-works"
          className="inline-flex items-center gap-2 px-5 h-11 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-bg-tertiary)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          See a sample report
        </a>
      </div>
    </section>
  );
}
