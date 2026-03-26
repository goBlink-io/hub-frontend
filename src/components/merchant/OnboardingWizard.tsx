"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Zap,
  Wallet,
  Settings,
  Check,
  Loader2,
  Store,
} from "lucide-react";

interface OnboardingWizardProps {
  merchantId: string;
  businessName: string;
  currentCurrency: string;
  currentTimezone: string;
  alreadyCompleted: boolean;
}

const CURRENCIES = [
  "USD", "CAD", "EUR", "GBP", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK",
  "NZD", "SGD", "HKD", "KRW", "MXN", "BRL", "INR", "TRY", "ZAR",
] as const;

const CHAINS: Record<string, { name: string; tokens: string[] }> = {
  base: { name: "Base", tokens: ["USDC", "USDT", "ETH"] },
  ethereum: { name: "Ethereum", tokens: ["USDC", "USDT", "ETH"] },
  arbitrum: { name: "Arbitrum", tokens: ["USDC", "USDT", "ETH"] },
  optimism: { name: "Optimism", tokens: ["USDC", "USDT", "ETH"] },
  polygon: { name: "Polygon", tokens: ["USDC", "USDT", "MATIC"] },
  solana: { name: "Solana", tokens: ["USDC", "USDT", "SOL"] },
  near: { name: "NEAR", tokens: ["USDC", "USDT", "NEAR"] },
  sui: { name: "Sui", tokens: ["USDC", "SUI"] },
};

const STEP_LABELS = ["Business Info", "Settlement", "Review"];

function isValidAddress(chain: string, addr: string): boolean {
  if (!addr) return false;
  const evmChains = ["base", "ethereum", "arbitrum", "optimism", "polygon"];
  if (evmChains.includes(chain)) return /^0x[a-fA-F0-9]{40}$/.test(addr);
  if (chain === "solana") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
  if (chain === "near") return /^[a-z0-9._-]+\.near$/.test(addr) || /^[a-f0-9]{64}$/.test(addr);
  if (chain === "sui") return /^0x[a-fA-F0-9]{64}$/.test(addr);
  return addr.length > 5;
}

export function OnboardingWizard({
  merchantId,
  businessName: initialName,
  currentCurrency,
  currentTimezone,
  alreadyCompleted,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Business
  const [businessName, setBusinessName] = useState(initialName || "");
  const [displayCurrency, setDisplayCurrency] = useState(currentCurrency || "USD");

  // Step 2: Settlement
  const [settlementChain, setSettlementChain] = useState("base");
  const [settlementToken, setSettlementToken] = useState("USDC");
  const [walletAddress, setWalletAddress] = useState("");

  const availableTokens = CHAINS[settlementChain]?.tokens || [];

  const canProceed = (() => {
    if (step === 0) return businessName.trim().length >= 2;
    if (step === 1) return walletAddress && isValidAddress(settlementChain, walletAddress);
    return true;
  })();

  const handleComplete = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/merchant/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          businessName: businessName.trim(),
          displayCurrency,
          settlementChain,
          settlementToken,
          walletAddress: walletAddress.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to complete onboarding");
      }

      router.push("/merchant");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [merchantId, businessName, displayCurrency, settlementChain, settlementToken, walletAddress, router]);

  if (alreadyCompleted) {
    router.push("/merchant");
    return null;
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center">
          <div
            className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, var(--color-primary), rgb(139, 92, 246))" }}
          >
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Set Up Your Merchant Account
          </h2>
          <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>
            Accept crypto payments from any chain. Non-custodial, instant settlement.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: i <= step ? "var(--color-primary)" : "var(--color-bg-tertiary)",
                  color: i <= step ? "white" : "var(--color-text-tertiary)",
                }}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline"
                style={{ color: i <= step ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="w-8 h-0.5"
                  style={{ backgroundColor: i < step ? "var(--color-primary)" : "var(--color-border)" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Steps */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
          }}
        >
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Store className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Business Information
                </h2>
              </div>

              <div className="space-y-2">
                <label htmlFor="merchant-business-name" className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Business Name
                </label>
                <input
                  id="merchant-business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your Business Name"
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
                <label htmlFor="merchant-display-currency" className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Display Currency
                </label>
                <select
                  id="merchant-display-currency"
                  value={displayCurrency}
                  onChange={(e) => setDisplayCurrency(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg-tertiary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                    minHeight: "44px",
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  All values in your dashboard will be shown in this currency.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Settlement Configuration
                </h2>
              </div>

              <div className="space-y-2">
                <label htmlFor="merchant-settlement-chain" className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Settlement Chain
                </label>
                <select
                  id="merchant-settlement-chain"
                  value={settlementChain}
                  onChange={(e) => {
                    setSettlementChain(e.target.value);
                    const tokens = CHAINS[e.target.value]?.tokens || [];
                    if (!tokens.includes(settlementToken)) {
                      setSettlementToken(tokens[0] || "USDC");
                    }
                  }}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg-tertiary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                    minHeight: "44px",
                  }}
                >
                  {Object.entries(CHAINS).map(([key, chain]) => (
                    <option key={key} value={key}>{chain.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="merchant-settlement-token" className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Settlement Token
                </label>
                <select
                  id="merchant-settlement-token"
                  value={settlementToken}
                  onChange={(e) => setSettlementToken(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg-tertiary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                    minHeight: "44px",
                  }}
                >
                  {availableTokens.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="merchant-wallet-address" className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Wallet Address
                </label>
                <input
                  id="merchant-wallet-address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder={`Your ${CHAINS[settlementChain]?.name || ""} wallet address`}
                  className="w-full rounded-lg px-3 py-2.5 text-sm font-mono"
                  style={{
                    backgroundColor: "var(--color-bg-tertiary)",
                    border: `1px solid ${walletAddress && !isValidAddress(settlementChain, walletAddress) ? "var(--color-error)" : "var(--color-border)"}`,
                    color: "var(--color-text-primary)",
                    minHeight: "44px",
                  }}
                />
                {walletAddress && !isValidAddress(settlementChain, walletAddress) && (
                  <p className="text-xs" style={{ color: "var(--color-error)" }}>
                    Invalid address format for {CHAINS[settlementChain]?.name}
                  </p>
                )}
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  This is where your settled funds will be sent. Double-check the address.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Review & Complete
                </h2>
              </div>

              <div className="space-y-3">
                <ReviewItem label="Business Name" value={businessName} />
                <ReviewItem label="Display Currency" value={displayCurrency} />
                <ReviewItem label="Settlement Chain" value={CHAINS[settlementChain]?.name || settlementChain} />
                <ReviewItem label="Settlement Token" value={settlementToken} />
                <ReviewItem label="Wallet Address" value={walletAddress} mono />
              </div>

              {error && (
                <div
                  className="text-sm px-4 py-3 rounded-lg"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.1)",
                    color: "var(--color-error)",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                minHeight: "44px",
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEP_LABELS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "white",
                minHeight: "44px",
              }}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "white",
                minHeight: "44px",
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg"
      style={{ backgroundColor: "var(--color-bg-tertiary)" }}
    >
      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span
        className={`text-sm font-medium ${mono ? "font-mono" : ""}`}
        style={{ color: "var(--color-text-primary)" }}
      >
        {mono && value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value}
      </span>
    </div>
  );
}
