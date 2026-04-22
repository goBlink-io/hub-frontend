"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { FileDropzone } from "./FileDropzone";
import { rememberJob } from "./jobStorage";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/ToastContext";
import type { JobCreated, ResubmitStatus } from "@/types/audit";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ResubmitDialogProps {
  open: boolean;
  onClose: () => void;
  auditId: string;
  maxBytes: number;
}

export function ResubmitDialog({
  open,
  onClose,
  auditId,
  maxBytes,
}: ResubmitDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<ResubmitStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus(null);
    setStatusError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/zion/resubmit-status/${encodeURIComponent(auditId)}`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setStatusError(body.error || `Status lookup failed (${res.status})`);
          return;
        }
        setStatus((await res.json()) as ResubmitStatus);
      } catch {
        if (!cancelled) setStatusError("Could not reach server.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, auditId]);

  // Focus management: capture the previously-focused element, move focus
  // into the dialog on open, and restore it on close. While open, trap Tab
  // so it cycles only through focusable descendants of the dialog.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const focusInitial = () => {
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? dialogRef.current)?.focus();
    };
    // Defer so the dialog's children are mounted before we query them.
    const id = requestAnimationFrame(focusInitial);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!submitting) onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus?.();
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const canResubmit = status?.canResubmit ?? false;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !canResubmit) return;
    if (files.length === 0) {
      toast("Add at least one file.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      for (const file of files) form.append("files", file, file.name);
      form.append("originalAuditId", auditId);

      const res = await fetch("/api/zion/resubmit", {
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
        toast(body.error || `Resubmit failed (${res.status})`, "error");
        return;
      }

      const job = (await res.json()) as JobCreated;
      rememberJob(job);
      onClose();
      router.push(`/audit/${encodeURIComponent(job.jobId)}`);
    } catch (err) {
      toast("Network error. Please try again.", "error");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: "var(--z-modal)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resubmit-title"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
          zIndex: "var(--z-modal-backdrop)",
        }}
        onClick={() => !submitting && onClose()}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-lg max-h-[90vh] overflow-auto"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          zIndex: "var(--z-modal)",
        }}
      >
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div>
            <h2
              id="resubmit-title"
              className="text-base font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Resubmit audit
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Upload updated contract files to re-audit and compare against the
              original.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="p-1 flex-shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-5 py-4 space-y-4">
          <StatusBanner status={status} error={statusError} />

          <FileDropzone
            files={files}
            onChange={setFiles}
            maxBytes={maxBytes}
            disabled={submitting || !canResubmit}
          />

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={!canResubmit}
              icon={!submitting ? <ArrowRight size={16} /> : undefined}
            >
              {submitting ? "Resubmitting…" : "Resubmit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusBanner({
  status,
  error,
}: {
  status: ResubmitStatus | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div
        className="text-xs px-3 py-2"
        style={{
          color: "var(--color-danger)",
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderRadius: "var(--radius-md)",
        }}
      >
        {error}
      </div>
    );
  }
  if (!status) {
    return (
      <div
        className="text-xs px-3 py-2"
        style={{
          color: "var(--color-text-tertiary)",
          backgroundColor: "var(--color-bg-tertiary)",
          borderRadius: "var(--radius-md)",
        }}
      >
        Checking eligibility…
      </div>
    );
  }
  if (!status.canResubmit) {
    return (
      <div
        className="text-xs px-3 py-2"
        style={{
          color: "var(--color-warning)",
          backgroundColor: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          borderRadius: "var(--radius-md)",
        }}
      >
        Free resubmissions exhausted. Additional resubmissions will be available
        via paid plans soon.
      </div>
    );
  }
  return (
    <div
      className="text-xs px-3 py-2"
      style={{
        color: "var(--color-text-secondary)",
        backgroundColor: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {status.resubmissionsRemaining} free resubmission
      {status.resubmissionsRemaining === 1 ? "" : "s"} remaining
      {status.resubmitHistory?.length > 0 && (
        <>
          {" "}· previously used {status.resubmitHistory.length}{" "}
          time{status.resubmitHistory.length === 1 ? "" : "s"}
        </>
      )}
      .
    </div>
  );
}
