"use client";

import { useState, useCallback } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("bb_visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("bb_visitor_id", id);
  }
  return id;
}

function hasAlreadyVoted(pageId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`bb_feedback_${pageId}`) !== null;
}

type WidgetState = "idle" | "comment" | "submitting" | "done" | "already_voted";

export function FeedbackWidget({ spaceId, pageId }: { spaceId: string; pageId: string }) {
  const [state, setState] = useState<WidgetState>(() =>
    hasAlreadyVoted(pageId) ? "already_voted" : "idle",
  );
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");

  const submit = useCallback(
    async (isHelpful: boolean, feedbackComment?: string) => {
      setState("submitting");
      try {
        const res = await fetch("/api/book/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            space_id: spaceId,
            page_id: pageId,
            helpful: isHelpful,
            comment: feedbackComment || null,
            user_fingerprint: getVisitorId(),
          }),
        });
        if (res.ok || res.status === 409) {
          localStorage.setItem(`bb_feedback_${pageId}`, "1");
          setState("done");
        } else {
          setState("comment");
        }
      } catch {
        setState("comment");
      }
    },
    [spaceId, pageId],
  );

  if (state === "already_voted" || state === "done") {
    return (
      <div className="mt-12 border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Thanks for your feedback!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
      {state === "idle" && (
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Was this page helpful?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setHelpful(true); setState("comment"); }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition"
              style={{
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              <ThumbsUp size={14} /> Yes
            </button>
            <button
              type="button"
              onClick={() => { setHelpful(false); setState("comment"); }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition"
              style={{
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              <ThumbsDown size={14} /> No
            </button>
          </div>
        </div>
      )}

      {(state === "comment" || state === "submitting") && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {helpful ? (
              <ThumbsUp size={16} style={{ color: "var(--color-success)" }} />
            ) : (
              <ThumbsDown size={16} style={{ color: "var(--color-error)" }} />
            )}
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {helpful ? "Glad it helped!" : "Sorry to hear that."} Any additional feedback?
            </span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us more (optional)..."
            rows={3}
            maxLength={2000}
            disabled={state === "submitting"}
            className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none transition disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => helpful !== null && submit(helpful, comment)}
              disabled={state === "submitting"}
              className="rounded-lg px-3 py-1.5 text-sm text-white transition disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {state === "submitting" ? "Sending..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => helpful !== null && submit(helpful)}
              disabled={state === "submitting"}
              className="px-3 py-1.5 text-sm transition disabled:opacity-50"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
