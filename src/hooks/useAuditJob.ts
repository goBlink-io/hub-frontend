"use client";

import { useEffect, useRef, useState } from "react";
import type { JobStatus } from "@/types/audit";

type HookState =
  | { state: "loading" }
  | { state: "pending"; data: JobStatus }
  | { state: "completed"; data: JobStatus & { status: "completed" } }
  | { state: "failed"; data: JobStatus & { status: "failed" } }
  | { state: "error"; error: string; retrying: boolean };

export interface UseAuditJob {
  state: HookState["state"];
  status?: JobStatus;
  error?: string;
  retrying: boolean;
  refetch: () => void;
}

function pickDelay(startedAt: number): number {
  const elapsed = Date.now() - startedAt;
  if (elapsed < 30_000) return 2_000;
  if (elapsed < 120_000) return 5_000;
  return 10_000;
}

/**
 * Polls `/api/zion/jobs/:jobId` until the job is in a terminal state.
 *
 * Cadence: 2s for the first 30s, 5s until 2min, 10s afterwards.
 * On network failure, keeps the last state and marks `retrying` so the UI
 * can show a reconnect hint without flashing the whole progress view.
 * 429 with Retry-After is respected (capped at 60s).
 */
export function useAuditJob(jobId: string | null): UseAuditJob {
  const [hookState, setHookState] = useState<HookState>({ state: "loading" });
  const mountedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!jobId) return;

    mountedAtRef.current = Date.now();
    let cancelled = false;

    const schedule = (delay: number) => {
      if (cancelled) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(poll, delay);
    };

    const poll = async () => {
      if (cancelled) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      tickRef.current += 1;
      const myTick = tickRef.current;

      try {
        const res = await fetch(`/api/zion/jobs/${encodeURIComponent(jobId)}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (cancelled || myTick !== tickRef.current) return;

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
          schedule(Math.min(60, Math.max(1, retryAfter)) * 1000);
          return;
        }

        if (res.status === 401) {
          setHookState({
            state: "error",
            error: "You are not signed in. Please log in to view this audit.",
            retrying: false,
          });
          return;
        }

        if (res.status === 404) {
          setHookState({
            state: "error",
            error: "Audit not found.",
            retrying: false,
          });
          return;
        }

        if (!res.ok && res.status !== 202) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setHookState({
            state: "error",
            error: body.error || `Prover responded ${res.status}`,
            retrying: true,
          });
          schedule(pickDelay(mountedAtRef.current));
          return;
        }

        const status = (await res.json()) as JobStatus;

        if (status.status === "completed") {
          setHookState({ state: "completed", data: status });
          return;
        }
        if (status.status === "failed") {
          setHookState({ state: "failed", data: status });
          return;
        }
        setHookState({ state: "pending", data: status });
        schedule(pickDelay(mountedAtRef.current));
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setHookState((prev) =>
          prev.state === "pending"
            ? { state: "error", error: "Reconnecting…", retrying: true }
            : { state: "error", error: "Network error. Retrying…", retrying: true },
        );
        schedule(pickDelay(mountedAtRef.current));
      }
    };

    // Kick off immediately.
    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [jobId]);

  const refetch = () => {
    tickRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    mountedAtRef.current = Date.now();
    // Retrigger by clearing state; the effect does not re-run without jobId
    // changing, so we fire a one-off fetch.
    void fetch(`/api/zion/jobs/${encodeURIComponent(jobId ?? "")}`, {
      cache: "no-store",
    }).then(async (res) => {
      if (res.status === 401 || res.status === 404) return;
      if (!res.ok && res.status !== 202) return;
      const status = (await res.json()) as JobStatus;
      if (status.status === "completed") setHookState({ state: "completed", data: status });
      else if (status.status === "failed") setHookState({ state: "failed", data: status });
      else setHookState({ state: "pending", data: status });
    });
  };

  return {
    state: hookState.state,
    status: "data" in hookState ? hookState.data : undefined,
    error: "error" in hookState ? hookState.error : undefined,
    retrying: "retrying" in hookState ? hookState.retrying : false,
    refetch,
  };
}
