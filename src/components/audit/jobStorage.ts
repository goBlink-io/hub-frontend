/**
 * Client-side localStorage cache of recently-submitted audit jobs.
 *
 * Not the source of truth — Supabase is. This exists only so the landing
 * page can show a "Recent audits" panel without a round-trip.
 */

import type { JobCreated } from "@/types/audit";

const KEY = "goblink_audit_jobs";
const MAX_ENTRIES = 20;

export interface RememberedJob {
  jobId: string;
  auditId: string;
  at: number;
}

export function rememberJob(job: JobCreated): void {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: RememberedJob[] = raw ? (JSON.parse(raw) as RememberedJob[]) : [];
    const next = [
      { jobId: job.jobId, auditId: job.auditId, at: Date.now() },
      ...list.filter((j) => j.jobId !== job.jobId),
    ].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable or JSON corrupt — ignore.
  }
}

export function listRememberedJobs(): RememberedJob[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (j): j is RememberedJob =>
        typeof j === "object" &&
        j !== null &&
        typeof (j as RememberedJob).jobId === "string" &&
        typeof (j as RememberedJob).auditId === "string" &&
        typeof (j as RememberedJob).at === "number",
    );
  } catch {
    return [];
  }
}

export function forgetJob(jobId: string): void {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const list = JSON.parse(raw) as RememberedJob[];
    const next = list.filter((j) => j.jobId !== jobId);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
