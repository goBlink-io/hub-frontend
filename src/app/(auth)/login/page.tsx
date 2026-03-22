"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Eye, EyeOff, Chrome } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@goblink/connect/react";
import { createClient } from "@/lib/supabase/client";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const msg = authError.message;
      if (msg.toLowerCase().includes("user not found") || msg.toLowerCase().includes("no user")) {
        setEmailError(msg);
      } else if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials") || msg.toLowerCase().includes("password")) {
        setPasswordError(msg);
      } else {
        setError(msg);
      }
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleOAuthLogin(provider: "google" | "apple") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  const handleEmailBlur = () => {
    if (email && !isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordBlur = () => {
    if (!password) {
      setPasswordError("Password is required");
    } else {
      setPasswordError(null);
    }
  };

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-8"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    >
      <div
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <Logo size="lg" />
          <p
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Cross-Chain Everything
          </p>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          {error && (
            <div
              className="px-4 py-3 text-sm"
              role="alert"
              aria-live="polite"
              style={{
                color: "var(--color-danger)",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Email<span className="text-[var(--color-danger)]"> *</span>
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-text-muted)" }}
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                onBlur={handleEmailBlur}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-3 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  border: emailError ? "1px solid var(--color-danger)" : "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                }}
              />
            </div>
            {emailError && (
              <p className="text-xs mt-1" role="alert" aria-live="polite" style={{ color: "var(--color-danger)" }}>
                {emailError}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Password<span className="text-[var(--color-danger)]"> *</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                onBlur={handlePasswordBlur}
                placeholder="••••••••"
                required
                className="w-full pl-4 pr-10 py-3 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  border: passwordError ? "1px solid var(--color-danger)" : "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-text-muted)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs mt-1" role="alert" aria-live="polite" style={{ color: "var(--color-danger)" }}>
                {passwordError}
              </p>
            )}
          </div>

          <Button type="submit" fullWidth loading={loading}>
            Sign in with email
          </Button>
        </form>

        {/* OAuth divider */}
        <div className="flex items-center gap-3">
          <div
            className="h-px flex-1"
            style={{ backgroundColor: "var(--color-border)" }}
          />
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            or continue with
          </span>
          <div
            className="h-px flex-1"
            style={{ backgroundColor: "var(--color-border)" }}
          />
        </div>

        {/* OAuth buttons */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => handleOAuthLogin("google")}
            icon={<Chrome size={16} />}
          >
            Google
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => handleOAuthLogin("apple")}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            }
          >
            Apple
          </Button>
        </div>

        {/* Wallet divider */}
        <div className="flex items-center gap-3">
          <div
            className="h-px flex-1"
            style={{ backgroundColor: "var(--color-border)" }}
          />
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            or connect wallet
          </span>
          <div
            className="h-px flex-1"
            style={{ backgroundColor: "var(--color-border)" }}
          />
        </div>

        {/* Wallet connect */}
        <div className="flex justify-center">
          <ConnectButton theme="dark" label="Connect Wallet" />
        </div>

        {/* Sign up link */}
        <p
          className="text-center text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium transition-colors"
            style={{ color: "var(--color-primary)" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
