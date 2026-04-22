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
          Starting-point draft &mdash; not legal advice. GDPR (EU/EEA/UK),
          CCPA/CPRA (California), LGPD (Brazil), and any sector-specific
          obligations should be reviewed by counsel before launch. Replace the
          &ldquo;[CONTROLLER_ENTITY]&rdquo;, &ldquo;[JURISDICTION]&rdquo;, and
          &ldquo;[CONTACT_EMAIL]&rdquo; markers below.
        </p>

        <Section n={1} title="Who we are">
          <p>
            This policy describes how goBlink ([CONTROLLER_ENTITY]) collects,
            uses, and shares personal information when you use our websites,
            apps, and APIs (collectively, the &ldquo;Service&rdquo;). For
            purposes of the GDPR and comparable laws,
            [CONTROLLER_ENTITY] is the data controller of the information
            described here.
          </p>
        </Section>

        <Section n={2} title="What we collect">
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Wallet addresses</strong> you connect. Stored per
              product (Blink, Merchant, Book). On-chain activity associated
              with a public address is public by nature.
            </li>
            <li>
              <strong>Account identity</strong>: the Supabase user ID
              (&ldquo;sub&rdquo; claim on your session token) and, if you
              provide one, an email address &mdash; used for audit
              notifications, team invites, and merchant account messages.
            </li>
            <li>
              <strong>Product data you submit</strong>: source code / repos
              you submit to Audit, payment link metadata (amount, memo,
              recipient), Book site content, merchant invoices, custom
              domain names.
            </li>
            <li>
              <strong>Operational logs</strong>: request IPs, user agents,
              timestamps, correlation IDs, and error details. Used for
              debugging, abuse prevention, and capacity planning.
            </li>
            <li>
              <strong>Analytics for published Book sites</strong>: a
              localStorage-generated visitor UUID, page URLs, referrer,
              search queries, and helpful/not-helpful feedback votes.
              First-party only &mdash; no third-party trackers.
            </li>
            <li>
              <strong>Cookies and similar storage</strong>: HTTP-only
              session cookies for authentication, and browser localStorage
              for wallet-connection state, preferences, transfer history,
              and visitor analytics.
            </li>
          </ul>
        </Section>

        <Section n={3} title="What we don&rsquo;t collect">
          <ul className="list-disc space-y-1 pl-6">
            <li>Seed phrases, private keys, or wallet passwords. Ever.</li>
            <li>
              Third-party advertising or cross-site trackers (no Facebook
              pixel, no Google Analytics, no ad cookies).
            </li>
            <li>
              Payment card data &mdash; Merchant accepts on-chain payments
              only and does not store card numbers or bank credentials.
            </li>
          </ul>
        </Section>

        <Section n={4} title="How we use your information">
          <p>We process personal information to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Operate the Service (mint session JWTs, route swaps, run
              audits, render Book sites, process merchant webhooks).
            </li>
            <li>
              Communicate with you about your account, audit results, team
              invites, or service changes.
            </li>
            <li>Detect, prevent, and investigate abuse, fraud, and security incidents.</li>
            <li>
              Enforce our Terms, comply with legal obligations, and exercise
              or defend legal claims.
            </li>
            <li>
              Improve the Service using aggregate usage metrics that do not
              identify individuals.
            </li>
          </ul>
        </Section>

        <Section n={5} title="Legal bases (EU/UK/EEA)">
          <p>
            Where the GDPR or UK GDPR applies, we rely on the following legal
            bases:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Contract</strong> (Art. 6(1)(b)) &mdash; to provide the
              Service you&apos;ve signed in to use.
            </li>
            <li>
              <strong>Legitimate interests</strong> (Art. 6(1)(f)) &mdash;
              to secure the Service, prevent abuse, and keep operational
              logs.
            </li>
            <li>
              <strong>Consent</strong> (Art. 6(1)(a)) &mdash; for optional
              email communications, where applicable. You can withdraw
              consent at any time.
            </li>
            <li>
              <strong>Legal obligation</strong> (Art. 6(1)(c)) &mdash; to
              comply with applicable laws, sanctions screening, and
              regulatory requests.
            </li>
          </ul>
        </Section>

        <Section n={6} title="Who we share with">
          <p>
            We do not sell personal information. We share it with a limited
            set of infrastructure providers acting as processors on our
            behalf:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Supabase</strong> &mdash; identity, database, and
              storage for each goBlink product.
            </li>
            <li>
              <strong>Vercel</strong> &mdash; web hosting, edge caching,
              and deployment infrastructure.
            </li>
            <li>
              <strong>Zion Prover</strong> &mdash; receives audit
              submissions you initiate.
            </li>
            <li>
              <strong>Blockchain RPC providers</strong> &mdash; forward
              reads and broadcast transactions you initiate; no personal
              information beyond the wallet addresses and tx data you
              choose to transact.
            </li>
            <li>
              <strong>Email provider (Resend, if enabled)</strong> &mdash;
              delivers transactional email (invites, notifications).
            </li>
            <li>
              <strong>Error monitoring (Sentry, if enabled)</strong> &mdash;
              receives sanitised error reports with redaction of known
              sensitive keys.
            </li>
          </ul>
          <p>
            We may also disclose information to comply with law, respond to
            legal process, protect our rights, or in connection with a
            merger, acquisition, or asset transfer (subject to reasonable
            confidentiality protections).
          </p>
        </Section>

        <Section n={7} title="International transfers">
          <p>
            Our processors operate globally. Where we transfer personal
            information from the EU, UK, or Switzerland to a country that
            does not have an adequacy decision, we rely on the European
            Commission&apos;s Standard Contractual Clauses (or the UK
            International Data Transfer Addendum) and implement
            supplementary safeguards where appropriate.
          </p>
        </Section>

        <Section n={8} title="Retention">
          <p>
            We retain personal information only as long as needed for the
            purposes described above or as required by law. Typical
            retention windows:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Account + wallet linkages</strong>: for the life of
              your account.
            </li>
            <li>
              <strong>Operational logs</strong>: up to 90 days for debugging
              and abuse prevention, unless extended for an active security
              investigation.
            </li>
            <li>
              <strong>Audit submissions and reports</strong>: retained with
              your account so you can access past audits, and deleted on
              request or account closure.
            </li>
            <li>
              <strong>Book analytics</strong>: aggregated indefinitely;
              raw per-visitor events retained as configured by the site
              owner.
            </li>
          </ul>
          <p>
            On-chain data is public and immutable. Deleting your account
            cannot remove anything already published to a blockchain.
          </p>
        </Section>

        <Section n={9} title="Your rights">
          <p>
            Depending on where you live, you may have the right to access,
            correct, delete, or port your personal information; to restrict
            or object to processing; to withdraw consent; and to lodge a
            complaint with your local data protection authority. California
            residents have the additional rights described in the CCPA /
            CPRA (including the right to know, delete, correct, and limit
            the use of sensitive personal information &mdash; we do not
            sell or &ldquo;share&rdquo; personal information for
            cross-context behavioural advertising).
          </p>
          <p>
            To exercise any of these rights, email{" "}
            <a
              href="mailto:[CONTACT_EMAIL]"
              className="underline"
              style={{ color: "var(--color-primary)" }}
            >
              [CONTACT_EMAIL]
            </a>
            . We may need to verify your identity before acting on a
            request. On-chain data cannot be deleted by its nature.
          </p>
        </Section>

        <Section n={10} title="Children">
          <p>
            The Service is not directed to children under 16, and we do not
            knowingly collect personal information from them. If you
            believe a child has provided us with personal information,
            contact us and we will delete it.
          </p>
        </Section>

        <Section n={11} title="Security">
          <p>
            We implement reasonable administrative, technical, and physical
            safeguards to protect personal information, including
            encryption in transit, access controls on production systems,
            and redaction of sensitive fields in error reports. No system
            is perfectly secure. You are responsible for the security of
            your wallet, private keys, and the devices you use to access
            the Service.
          </p>
        </Section>

        <Section n={12} title="Breach notification">
          <p>
            If we become aware of a personal data breach likely to result
            in a risk to your rights, we will notify affected users
            without undue delay and, where required, report the breach to
            the appropriate supervisory authority within the deadlines
            applicable under law.
          </p>
        </Section>

        <Section n={13} title="Changes to this policy">
          <p>
            We may update this policy from time to time. Material changes
            will be communicated through the Service or by email to the
            address on file. The &ldquo;Last updated&rdquo; date at the top
            reflects the latest revision.
          </p>
        </Section>

        <Section n={14} title="Contact">
          <p>
            For privacy requests, questions, or to reach our data protection
            contact:{" "}
            <a
              href="mailto:[CONTACT_EMAIL]"
              className="underline"
              style={{ color: "var(--color-primary)" }}
            >
              [CONTACT_EMAIL]
            </a>
            .
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2
        className="text-lg font-semibold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}
