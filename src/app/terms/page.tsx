import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "goBlink Terms of Service.",
};

export default function TermsPage() {
  return (
    <main
      id="main-content"
      className="mx-auto max-w-3xl px-6 py-12"
      style={{ color: "var(--color-text-primary)" }}
    >
      <Link href="/" className="mb-8 inline-block">
        <Logo size="md" />
      </Link>
      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p
        className="mb-8 text-xs"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Last updated: 2026-04-21
      </p>

      <div
        className="space-y-6 text-sm leading-relaxed"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <p
          className="p-4 text-xs"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-warning)",
          }}
        >
          These are placeholder terms. Engage counsel before launching to real
          users. This stub exists so legal links have a destination and so
          onboarding / checkout flows can reference binding language.
        </p>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            1. Acceptance
          </h2>
          <p>
            By using goBlink (the &quot;Service&quot;), you agree to these
            Terms. If you don&apos;t agree, don&apos;t use the Service.
          </p>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            2. Eligibility
          </h2>
          <p>
            You must be at least 18 years old and legally able to enter into a
            binding contract in your jurisdiction. Blockchain activity is
            subject to your local laws and regulations.
          </p>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            3. Your wallet and keys
          </h2>
          <p>
            goBlink is non-custodial. You control your wallet and private
            keys. We never hold funds, never request seed phrases, and cannot
            reverse on-chain transactions. Loss of keys means loss of access.
          </p>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            4. Audit feature disclaimer
          </h2>
          <p>
            The Audit feature (powered by Zion Prover) performs automated
            analysis and formal verification on smart-contract source. It is
            informational only. Results are not a guarantee, do not replace
            professional review, and do not constitute financial or security
            advice. You bear sole responsibility for decisions based on audit
            output.
          </p>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            5. Merchant &amp; Book features
          </h2>
          <p>
            Merchants using goBlink&apos;s payment rails are responsible for
            complying with applicable laws (tax, KYC/AML, consumer
            protection) in their jurisdiction. Book creators are responsible
            for content they publish and any copyright, trademark, or
            defamation claims arising from it.
          </p>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            6. Prohibited activity
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Illegal activity, fraud, or money laundering.</li>
            <li>Unauthorized scraping, reverse engineering, or exploits.</li>
            <li>
              Interfering with the Service&apos;s integrity, rate limits, or
              availability.
            </li>
          </ul>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            7. No warranty
          </h2>
          <p>
            The Service is provided &quot;as is&quot; without warranty of any
            kind. To the fullest extent permitted by law, goBlink disclaims
            all warranties, express or implied.
          </p>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            8. Contact
          </h2>
          <p>
            Questions? Reach us through the support contact on{" "}
            <Link
              href="/"
              className="underline"
              style={{ color: "var(--color-primary)" }}
            >
              goBlink.io
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
