"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Upload, Github } from "lucide-react";
import { FileDropzone } from "./FileDropzone";
import { GitHubAuditForm } from "./GitHubAuditForm";
import { rememberJob } from "./jobStorage";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/ToastContext";
import type { JobCreated, SuiExecutionMode } from "@/types/audit";

interface AuditSubmitFormProps {
  maxBytes: number;
  githubEnabled: boolean;
}

type Tab = "upload" | "github";

const SUI_MODES: { value: SuiExecutionMode; label: string; hint: string }[] = [
  {
    value: "parse-only",
    label: "Parse only",
    hint: "Fastest — syntax + pattern matching, no test execution.",
  },
  {
    value: "package-test",
    label: "Package tests",
    hint: "Runs `sui move test` during the audit. Recommended default.",
  },
  {
    value: "devnet-extended",
    label: "Devnet extended",
    hint: "Publishes to devnet for live execution proofs. Slowest.",
  },
];

export function AuditSubmitForm({
  maxBytes,
  githubEnabled,
}: AuditSubmitFormProps) {
  const [tab, setTab] = useState<Tab>("upload");

  return (
    <div className="space-y-4">
      {githubEnabled && (
        <nav
          className="flex gap-1 p-1"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <TabButton
            active={tab === "upload"}
            onClick={() => setTab("upload")}
            icon={<Upload size={14} />}
            label="Upload"
          />
          <TabButton
            active={tab === "github"}
            onClick={() => setTab("github")}
            icon={<Github size={14} />}
            label="GitHub"
          />
        </nav>
      )}
      {tab === "upload" && <UploadForm maxBytes={maxBytes} />}
      {tab === "github" && githubEnabled && <GitHubAuditForm />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 inline-flex items-center justify-center gap-2 h-9 text-sm font-medium transition-colors"
      style={{
        backgroundColor: active ? "var(--color-bg-tertiary)" : "transparent",
        color: active
          ? "var(--color-text-primary)"
          : "var(--color-text-secondary)",
        borderRadius: "var(--radius-sm)",
      }}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}

function UploadForm({ maxBytes }: { maxBytes: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [suiMode, setSuiMode] = useState<SuiExecutionMode>("package-test");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (files.length === 0) {
      toast("Add at least one file before submitting.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      for (const file of files) form.append("files", file, file.name);
      form.append("suiExecutionMode", suiMode);
      if (notifyEmail.trim()) form.append("notifyEmail", notifyEmail.trim());

      const res = await fetch("/api/zion/audit", {
        method: "POST",
        body: form,
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
      <FileDropzone
        files={files}
        onChange={setFiles}
        maxBytes={maxBytes}
        disabled={submitting}
      />

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
              className="flex flex-col gap-1 p-3 cursor-pointer transition-colors"
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
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="suiMode"
                  value={mode.value}
                  checked={suiMode === mode.value}
                  onChange={() => setSuiMode(mode.value)}
                  disabled={submitting}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {mode.label}
                </span>
              </div>
              <span
                className="text-xs"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {mode.hint}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label
          htmlFor="notifyEmail"
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Notify email (optional)
        </label>
        <input
          id="notifyEmail"
          type="email"
          placeholder="you@example.com"
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
          disabled={submitting}
          className="w-full h-11 px-3 text-sm"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
          }}
        />
        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          We&apos;ll email you when the report is ready.
        </p>
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={submitting}
        icon={!submitting ? <ArrowRight size={16} /> : undefined}
      >
        {submitting ? "Submitting…" : "Run audit"}
      </Button>
    </form>
  );
}
