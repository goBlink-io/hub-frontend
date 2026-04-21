import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "goBlink privacy policy.",
};

export default function PrivacyPage() {
  return (
    <main
      id="main-content"
      className="mx-auto max-w-3xl px-6 py-12"
      style={{ color: "var(--color-text-primary)" }}
    >
      <Link href="/" className="mb-8 inline-block">
        <Logo size="md" />
      </Link>
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
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
          Placeholder. Have counsel review before launch — particularly for
          GDPR (EU), CCPA (California), and LGPD (Brazil) obligations.
        </p>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            1. What we collect
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Wallet addresses</strong> you connect (stored per
              service — Blink, Merchant, Book).
            </li>
            <li>
              <strong>Email address</strong>, if you opt in (audit
              notifications, merchant account, team invites).
            </li>
            <li>
              <strong>On-chain activity you initiate</strong> through the app
              (swap routes, payment link metadata, audit submissions).
            </li>
            <li>
              <strong>Operational logs</strong>: request IPs, timestamps,
              errors — retained for debugging and abuse prevention.
            </li>
            <li>
              <strong>Analytics for published Book sites</strong>: visitor
              fingerprint (localStorage-generated UUID), page views, search
              terms, feedback votes. No third-party trackers.
            </li>
          </ul>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            2. What we don&apos;t collect
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Seed phrases or private keys. Ever.</li>
            <li>Third-party trackers (Facebook, Google Analytics, etc.).</li>
            <li>
              Browsing across sites — our cookies scope to goBlink properties
              only.
            </li>
          </ul>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            3. How we use it
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Run the Service (route swaps, verify audits, render sites).</li>
            <li>Rate-limit and prevent abuse.</li>
            <li>
              Email you about audits you requested or team invitations you
              accepted (if you provided an email).
            </li>
            <li>Aggregate anonymous usage metrics for product improvement.</li>
          </ul>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            4. Sharing
          </h2>
          <p>
            We don&apos;t sell personal data. We share with infrastructure
            providers necessary to run the Service (Supabase for storage,
            Vercel for hosting, Zion Prover for audit execution, blockchain
            RPCs for on-chain reads).
          </p>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            5. Your rights
          </h2>
          <p>
            EU/UK/California residents have the right to access, export, and
            delete personal data. Contact support to exercise these rights.
            On-chain data is immutable by nature and cannot be deleted.
          </p>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            6. Cookies
          </h2>
          <p>
            We use HTTP-only cookies for authentication and in-browser
            localStorage for wallet-connection state. No third-party ad
            cookies.
          </p>
        </section>

        <section>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            7. Contact
          </h2>
          <p>
            For privacy requests or questions:{" "}
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
