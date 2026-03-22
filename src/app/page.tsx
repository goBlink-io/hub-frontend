'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowLeftRight, CreditCard, Store, BookOpen,
  Code, Zap, Shield, Globe,
} from 'lucide-react';
import { Logo } from '@/components/shared/Logo';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const features = [
  {
    icon: ArrowLeftRight,
    title: 'Swap',
    desc: 'Cross-chain transfers in seconds. Any token, any chain — one click.',
  },
  {
    icon: CreditCard,
    title: 'Pay',
    desc: 'Create payment links anyone can use. No wallet required for senders.',
  },
  {
    icon: Code,
    title: 'Build',
    desc: 'SDK, Merchant tools, and BlinkBook — build on top of cross-chain rails.',
  },
];

const steps = [
  { num: '01', title: 'Connect', desc: 'Link any wallet — EVM, Solana, NEAR, Sui, and more.' },
  { num: '02', title: 'Choose', desc: 'Pick source and destination token + chain. We find the best route.' },
  { num: '03', title: 'Done', desc: 'Funds arrive in seconds. Non-custodial, always.' },
];

const products = [
  { icon: ArrowLeftRight, title: 'Swap', desc: 'Transfer any token across 26+ chains', href: '/swap' },
  { icon: Store, title: 'Merchant', desc: 'Accept crypto payments for your business', href: '/merchant' },
  { icon: BookOpen, title: 'BlinkBook', desc: 'Build and publish knowledge bases', href: '/book' },
  { icon: Code, title: 'SDK', desc: 'Integrate cross-chain into your app', href: '#' },
];

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <Logo size="lg" />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <motion.section
        className="card-hero mx-4 sm:mx-6 mt-8 sm:mt-16 mb-12 px-6 py-16 sm:py-24 text-center max-w-5xl lg:mx-auto w-auto"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
          variants={fadeUp}
        >
          <span className="text-blue-gradient">Cross-Chain</span>{' '}
          <span style={{ color: 'var(--color-text-primary)' }}>Everything</span>
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl max-w-2xl mx-auto mb-10"
          style={{ color: 'var(--color-text-secondary)' }}
          variants={fadeUp}
        >
          One app. Every chain. Swap, pay, and build across 26+ blockchains — non-custodial, instant, and simple.
        </motion.p>
        <motion.div className="flex flex-col sm:flex-row gap-3 justify-center" variants={fadeUp}>
          <Link
            href="/signup"
            className="px-8 py-3 rounded-xl text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          >
            Connect Wallet
          </Link>
        </motion.div>
      </motion.section>

      {/* Stats Bar */}
      <motion.div
        className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-16 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
      >
        {['26+ Chains', '65+ Tokens', 'Non-Custodial'].map((stat) => (
          <motion.div
            key={stat}
            className="flex items-center gap-2 text-sm sm:text-base font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
            variants={fadeUp}
          >
            <Zap className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            {stat}
          </motion.div>
        ))}
      </motion.div>

      {/* Feature Cards */}
      <motion.section
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto px-4 sm:px-6 mb-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
      >
        {features.map((f) => (
          <motion.div key={f.title} className="card-standard p-6" variants={fadeUp}>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ background: 'rgba(59,130,246,0.1)' }}
            >
              <f.icon className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {f.desc}
            </p>
          </motion.div>
        ))}
      </motion.section>

      {/* How It Works */}
      <motion.section
        className="max-w-4xl mx-auto px-4 sm:px-6 mb-20 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
      >
        <motion.h2
          className="text-2xl sm:text-3xl font-bold mb-12"
          variants={fadeUp}
        >
          <span className="text-blue-gradient">How It Works</span>
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((s) => (
            <motion.div key={s.num} className="flex flex-col items-center" variants={fadeUp}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-4"
                style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--color-primary)' }}
              >
                {s.num}
              </div>
              <h3 className="text-base font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {s.title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Products Grid */}
      <motion.section
        className="max-w-5xl mx-auto px-4 sm:px-6 mb-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
      >
        <motion.h2
          className="text-2xl sm:text-3xl font-bold mb-8 text-center"
          variants={fadeUp}
        >
          <span className="text-blue-gradient">Products</span>
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((p) => (
            <motion.div key={p.title} variants={fadeUp}>
              <Link
                href={p.href}
                className="card-standard p-5 flex items-start gap-4 group block"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.1)' }}
                >
                  <p.icon className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <h3 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {p.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {p.desc}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className="card-hero mx-4 sm:mx-6 mb-20 px-6 py-14 text-center max-w-4xl lg:mx-auto w-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
      >
        <motion.h2
          className="text-2xl sm:text-3xl font-bold mb-4"
          variants={fadeUp}
        >
          Ready to go{' '}
          <span className="text-blue-gradient">cross-chain</span>?
        </motion.h2>
        <motion.p
          className="text-base mb-8"
          style={{ color: 'var(--color-text-secondary)' }}
          variants={fadeUp}
        >
          Join thousands of users swapping across every major blockchain.
        </motion.p>
        <motion.div className="flex flex-col sm:flex-row gap-3 justify-center" variants={fadeUp}>
          <Link
            href="/signup"
            className="px-8 py-3 rounded-xl text-base font-semibold transition-all hover:scale-[1.02]"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl text-base font-semibold transition-all hover:scale-[1.02]"
            style={{
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          >
            Log In
          </Link>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer
        className="mt-auto px-6 py-8"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo size="sm" />
            <div className="flex gap-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              <Link href="/swap" className="hover:underline">Swap</Link>
              <Link href="/pay" className="hover:underline">Pay</Link>
              <Link href="/merchant" className="hover:underline">Merchant</Link>
              <Link href="/book" className="hover:underline">Book</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/goBlink_io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Twitter
            </a>
            <Globe className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
          </div>
        </div>
        <p
          className="text-center text-xs mt-6"
          style={{ color: 'var(--color-text-muted)' }}
        >
          © {new Date().getFullYear()} goBlink. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
