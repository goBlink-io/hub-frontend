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
          Starting-point draft — not legal advice. Governing-law, arbitration,
          and liability language in particular must be reviewed and tailored by
          qualified counsel before you rely on it in a live contract with users.
          Replace the &ldquo;[JURISDICTION]&rdquo; and
          &ldquo;[CONTACT_EMAIL]&rdquo; markers below.
        </p>

        <Section n={1} title="Agreement to these Terms">
          <p>
            These Terms of Service (the &ldquo;Terms&rdquo;) form a binding
            agreement between you and goBlink (&ldquo;goBlink&rdquo;,
            &ldquo;we&rdquo;, &ldquo;our&rdquo;) governing your access to and
            use of goBlink&apos;s websites, apps, APIs, and related services
            (collectively, the &ldquo;Service&rdquo;). By connecting a wallet,
            creating an account, or otherwise using the Service, you accept
            these Terms. If you do not accept them, do not use the Service.
          </p>
          <p>
            The Service comprises multiple products &mdash; including Blink
            (cross-chain swaps, payment links, audit), Merchant (merchant
            payments and invoicing), and Book (documentation sites). Some
            product-specific terms appear in numbered sections below and
            prevail over the general terms where they conflict.
          </p>
        </Section>

        <Section n={2} title="Eligibility">
          <p>
            You must be at least 18 years old (or the age of majority in your
            jurisdiction, whichever is greater) and legally able to enter into
            a binding contract. You must not be located in, or a resident of,
            any country subject to comprehensive sanctions by the United
            States, the European Union, the United Kingdom, or the United
            Nations, and you must not be listed on any applicable restricted
            parties list.
          </p>
          <p>
            You are responsible for ensuring that using the Service is legal
            in your jurisdiction and that you comply with any applicable laws
            and regulations, including those governing blockchain activity,
            payments, taxes, and data protection.
          </p>
        </Section>

        <Section n={3} title="Accounts, wallets, and keys">
          <p>
            goBlink is <strong>non-custodial</strong>. You control your wallet
            and private keys. We never hold your funds, never request seed
            phrases, and cannot reverse on-chain transactions. Loss, theft, or
            compromise of your keys is your responsibility and may result in
            permanent loss of access to funds or accounts.
          </p>
          <p>
            You are responsible for the security of the devices and browsers
            you use to access the Service. You must not share credentials or
            let unauthorised persons use your account.
          </p>
        </Section>

        <Section n={4} title="Blink swaps and routing">
          <p>
            The Service may route swap and bridge transactions through
            third-party protocols (including NEAR Intents and related
            infrastructure). Quoted rates, fees, and completion times are
            estimates and may change between quote and execution due to
            on-chain conditions outside our control. goBlink is not a party
            to any trade you execute and does not guarantee fills, slippage
            bounds beyond what you approve, or refunds for failed transfers
            once funds have been committed on-chain.
          </p>
        </Section>

        <Section n={5} title="Audit (informational only)">
          <p>
            The Audit feature performs automated analysis and formal
            verification over smart-contract source using the Zion Prover.
            Results are <strong>informational only</strong>. They do not
            guarantee the absence of defects or vulnerabilities, do not
            replace a professional manual review, and do not constitute
            financial, investment, legal, or security advice. You are solely
            responsible for decisions made on the basis of audit output,
            including decisions to deploy, modify, or invest in any contract
            or protocol.
          </p>
        </Section>

        <Section n={6} title="Merchant payments">
          <p>
            If you use the Merchant product to accept payments, you act as
            the merchant of record for those transactions. You are
            responsible for:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Complying with applicable laws, including tax, consumer
              protection, KYC / AML, sanctions, and licensing requirements in
              every jurisdiction where you operate.
            </li>
            <li>
              Publishing clear pricing, refund, cancellation, and fulfilment
              policies to your customers.
            </li>
            <li>
              Handling refund and chargeback requests directly with your
              customers. On-chain payments are final unless you voluntarily
              initiate a reverse transfer &mdash; goBlink cannot reverse them
              on your behalf.
            </li>
            <li>
              Any disputes between you and your customers. goBlink is not a
              party to those disputes and is not a broker, dealer, money
              transmitter, payment processor, or financial institution.
            </li>
          </ul>
        </Section>

        <Section n={7} title="Book &mdash; user content">
          <p>
            Book lets you publish documentation, knowledge bases, and paid
            content. You retain ownership of the content you publish. By
            publishing content on Book you grant goBlink a worldwide,
            non-exclusive, royalty-free licence to host, store, transmit, and
            display that content solely to operate and promote the Service.
          </p>
          <p>
            You are responsible for the legality of your content and for any
            copyright, trademark, defamation, privacy, or other claims
            arising from it. You must respond in good faith to takedown
            notices we forward to you.
          </p>
        </Section>

        <Section n={8} title="Acceptable use">
          <p>You must not:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Use the Service for illegal activity, fraud, money laundering,
              terrorism financing, or sanctions evasion.
            </li>
            <li>
              Infringe another person&apos;s intellectual property or privacy
              rights, or post content that is defamatory, harassing, or
              sexually explicit involving minors.
            </li>
            <li>
              Reverse engineer, scrape beyond public endpoints, probe for
              vulnerabilities without authorisation, or attempt to bypass
              rate limits, auth, or billing.
            </li>
            <li>
              Interfere with the Service&apos;s integrity, impersonate other
              users, or misuse team-invite, referral, or payout features.
            </li>
            <li>
              Use the Service to mint or distribute malware, phishing pages,
              or exploit payloads.
            </li>
          </ul>
          <p>
            We may suspend or terminate access without notice for material or
            repeated breach.
          </p>
        </Section>

        <Section n={9} title="Fees">
          <p>
            Some features charge fees (for example, swap routing, audit
            execution, or Book plan upgrades). Fees are displayed in the
            relevant flow before you confirm. On-chain fees and third-party
            protocol fees are separate from goBlink fees and are paid to
            those networks or protocols directly. Paid fees are generally
            non-refundable except as required by law.
          </p>
        </Section>

        <Section n={10} title="Third-party services">
          <p>
            The Service relies on third-party infrastructure (blockchain
            networks, RPC providers, NEAR Intents, Supabase, the Zion
            Prover, email and analytics providers, wallet connectors). Your
            use of those services is subject to their own terms. goBlink is
            not responsible for outages, errors, or losses caused by
            third-party services.
          </p>
        </Section>

        <Section n={11} title="Intellectual property">
          <p>
            Except for your content and for third-party components licensed
            to us, the Service and all associated materials are owned by
            goBlink and its licensors. We grant you a limited, revocable,
            non-exclusive, non-transferable licence to use the Service in
            accordance with these Terms. No other rights are granted.
          </p>
        </Section>

        <Section n={12} title="Disclaimers">
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; without warranties of any kind, whether
            express, implied, or statutory, to the fullest extent permitted
            by law. We disclaim all implied warranties of merchantability,
            fitness for a particular purpose, title, and non-infringement.
            We do not warrant that the Service will be uninterrupted,
            secure, or error-free, or that quotes, audit results, or
            on-chain outcomes will be accurate or complete.
          </p>
        </Section>

        <Section n={13} title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, in no event will
            goBlink or its affiliates be liable for any indirect, incidental,
            special, consequential, exemplary, or punitive damages, including
            lost profits, lost data, or loss of goodwill, arising from or
            related to your use of the Service, even if we have been advised
            of the possibility of such damages.
          </p>
          <p>
            Our aggregate liability to you for any claim related to the
            Service is limited to the greater of (a) the fees you paid to
            goBlink for the Service in the twelve (12) months before the
            event giving rise to the claim, or (b) one hundred U.S. dollars
            (US$100). Some jurisdictions do not allow these limits &mdash;
            in those jurisdictions our liability is limited to the minimum
            permitted by law.
          </p>
        </Section>

        <Section n={14} title="Indemnification">
          <p>
            You agree to defend, indemnify, and hold harmless goBlink and
            its affiliates from any claim, demand, loss, or expense
            (including reasonable legal fees) arising from your content,
            your use of the Service, your breach of these Terms, or your
            violation of any law or third-party right.
          </p>
        </Section>

        <Section n={15} title="Termination">
          <p>
            You may stop using the Service at any time. We may suspend or
            terminate your access with or without notice if we believe, in
            good faith, that you have breached these Terms, if required by
            law, or to protect the Service or other users. Sections that by
            their nature should survive termination will survive.
          </p>
        </Section>

        <Section n={16} title="Changes to these Terms">
          <p>
            We may update these Terms from time to time. Material changes
            will be communicated through the Service or to the email
            associated with your account (if any). Continued use after the
            effective date of the updated Terms constitutes acceptance.
          </p>
        </Section>

        <Section n={17} title="Governing law and disputes">
          <p>
            These Terms are governed by the laws of [JURISDICTION], without
            regard to its conflict-of-laws rules. Any dispute arising out of
            or relating to these Terms or the Service will be resolved
            exclusively by the courts of [JURISDICTION], and you and
            goBlink consent to the personal jurisdiction of those courts.
            You and goBlink waive any right to a jury trial and to
            participate in a class action to the fullest extent permitted
            by law.
          </p>
        </Section>

        <Section n={18} title="Miscellaneous">
          <p>
            These Terms, together with any product-specific terms and our
            Privacy Policy, are the entire agreement between you and
            goBlink about the Service. If any provision is held
            unenforceable, the remaining provisions remain in effect. Our
            failure to enforce any right is not a waiver of that right. You
            may not assign these Terms; we may assign them to an affiliate
            or in connection with a merger, acquisition, or sale of assets.
          </p>
        </Section>

        <Section n={19} title="Contact">
          <p>
            Questions about these Terms? Email{" "}
            <a
              href="mailto:[CONTACT_EMAIL]"
              className="underline"
              style={{ color: "var(--color-primary)" }}
            >
              [CONTACT_EMAIL]
            </a>{" "}
            or visit{" "}
            <Link
              href="/"
              className="underline"
              style={{ color: "var(--color-primary)" }}
            >
              goBlink.io
            </Link>
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
