"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/ToastContext";
import type { JobCreated, SuiExecutionMode } from "@/types/audit";
import { rememberJob } from "./jobStorage";

const SUI_MODES: { value: SuiExecutionMode; label: string }[] = [
  { value: "parse-only", label: "Parse only" },
  { value: "package-test", label: "Package tests" },
  { value: "devnet-extended", label: "Devnet extended" },
];

export function GitHubAuditForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [path, setPath] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [suiMode, setSuiMode] = useState<SuiExecutionMode>("package-test");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = url.trim();
    if (!trimmed) {
      toast("Enter a GitHub URL.", "error");
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (!parsed.hostname.endsWith("github.com")) {
        toast("Only github.com URLs are accepted.", "error");
        return;
      }
    } catch {
      toast("That doesn’t look like a valid URL.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/zion/audit/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          branch: branch.trim() || undefined,
          path: path.trim() || undefined,
          notifyEmail: notifyEmail.trim() || undefined,
          suiExecutionMode: suiMode,
        }),
      });

      if (res.status === 429) {
        const retry = res.headers.get("retry-after");
        const minutes = retry ? Math.ceil(parseInt(retry, 10) / 60) : null;
        toast(
          minutes
            ? `Rate limit reached. Try again in ~${minutes} min.`
            : "Rate limit reached. Try again later.",
          "error",
        );
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast(body.error || `Submit failed (${res.status})`, "error");
        return;
      }

      const job = (await res.json()) as JobCreated;
      rememberJob(job);
      router.push(`/audit/${encodeURIComponent(job.jobId)}`);
    } catch (err) {
      toast("Network error. Please try again.", "error");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="ghUrl"
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Repository URL
        </label>
        <div className="relative">
          <Github
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            id="ghUrl"
            type="url"
            required
            placeholder="https://github.com/org/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={submitting}
            className="w-full h-11 pl-9 pr-3 text-sm"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          Public repositories only. Shallow-cloned at audit time.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="ghBranch"
          label="Branch (optional)"
          placeholder="main"
          value={branch}
          onChange={setBranch}
          disabled={submitting}
        />
        <Field
          id="ghPath"
          label="Subpath (optional)"
          placeholder="packages/contracts"
          value={path}
          onChange={setPath}
          disabled={submitting}
        />
      </div>

      <fieldset
        className="space-y-2 p-3"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <legend
          className="text-xs font-semibold uppercase tracking-wider px-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          Sui execution mode
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SUI_MODES.map((mode) => (
            <label
              key={mode.value}
              className="flex items-center gap-2 p-2.5 cursor-pointer transition-colors"
              style={{
                backgroundColor:
                  suiMode === mode.value
                    ? "var(--color-bg-tertiary)"
                    : "transparent",
                border: `1px solid ${
                  suiMode === mode.value
                    ? "var(--color-border-active)"
                    : "var(--color-border)"
                }`,
                borderRadius: "var(--radius-md)",
              }}
            >
              <input
                type="radio"
                name="ghSuiMode"
                value={mode.value}
                checked={suiMode === mode.value}
                onChange={() => setSuiMode(mode.value)}
                disabled={submitting}
              />
              <span
                className="text-sm"
                style={{ color: "var(--color-text-primary)" }}
              >
                {mode.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        id="ghEmail"
        label="Notify email (optional)"
        type="email"
        placeholder="you@example.com"
        value={notifyEmail}
        onChange={setNotifyEmail}
        disabled={submitting}
      />

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={submitting}
        icon={!submitting ? <ArrowRight size={16} /> : undefined}
      >
        {submitting ? "Submitting…" : "Audit repository"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-11 px-3 text-sm"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-primary)",
        }}
      />
    </div>
  );
}
