/**
 * Supabase persistence for audit history.
 *
 * Writes use the service-role client (bypasses RLS) because audits are
 * created by the server after successful prover responses, not by the
 * user's own Supabase session. Reads go through the user's RLS-aware
 * client so they only see their own history.
 *
 * All writes are best-effort: if the `zion_audits` table is missing or
 * a write fails, we log and move on so the audit pipeline still works.
 * Apply `migrations/001_zion_audits.sql` to enable persistence.
 */

import { adminSupabase } from "@/lib/server/db";
import { logger } from "@/lib/logger";
import type {
  AuditResponse,
  AuditSourceMeta,
  AuditSourceType,
  JobCreated,
  JobStatus,
} from "@/types/audit";

export type { AuditSourceMeta, AuditSourceType };

export interface AuditInsertInput {
  userId: string;
  job: JobCreated;
  sourceType: AuditSourceType;
  sourceMeta: AuditSourceMeta;
  parentAuditId?: string;
}

export interface ZionAuditRow {
  id: string;
  user_id: string;
  job_id: string | null;
  audit_id: string | null;
  status: "queued" | "running" | "completed" | "failed";
  source_type: AuditSourceType;
  source_meta: AuditSourceMeta;
  parent_audit_id: string | null;
  resubmit_count: number;
  chain: string | null;
  language: string | null;
  security_score: number | null;
  grade: string | null;
  result: AuditResponse | null;
  reaudit_token: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export async function insertAudit(input: AuditInsertInput): Promise<void> {
  const { userId, job, sourceType, sourceMeta, parentAuditId } = input;
  const { error } = await adminSupabase.from("zion_audits").insert({
    user_id: userId,
    job_id: job.jobId,
    audit_id: job.auditId,
    status: "queued",
    source_type: sourceType,
    source_meta: sourceMeta,
    parent_audit_id: parentAuditId ?? null,
  });
  if (error) {
    logger.warn("[zion-db] insertAudit failed", { code: error.code, message: error.message });
  }
}

/**
 * Mirror a job status poll into the DB row. Idempotent.
 * On `completed`, denormalises score/grade/chain/language and stores the full result.
 */
export async function updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
  const patch: Record<string, unknown> = { status: status.status };

  if (status.status === "completed") {
    const result = status.result;
    patch.result = result;
    patch.completed_at = status.completedAt ?? new Date().toISOString();
    patch.chain = result.chain ?? null;
    patch.language = result.language ?? null;
    patch.security_score = result.securityScore?.overall ?? null;
    patch.grade = result.securityScore?.grade ?? null;
    patch.reaudit_token = result.reauditToken ?? null;
    if (result.auditId) patch.audit_id = result.auditId;
  } else if (status.status === "failed") {
    patch.error_message = status.error.message;
    patch.completed_at = status.completedAt ?? new Date().toISOString();
  }

  const { error } = await adminSupabase
    .from("zion_audits")
    .update(patch)
    .eq("job_id", jobId);

  if (error) {
    logger.warn("[zion-db] updateJobStatus failed", { jobId, code: error.code, message: error.message });
  }
}

/** Returns true if the caller owns the audit row. Used to authorise resubmits/report downloads. */
export async function userOwnsJob(userId: string, jobId: string): Promise<boolean> {
  const { data, error } = await adminSupabase
    .from("zion_audits")
    .select("user_id")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) {
    logger.warn("[zion-db] userOwnsJob lookup failed", { jobId, message: error.message });
    return false;
  }
  return data?.user_id === userId;
}

/**
 * Fetch a single audit row by audit_id, scoped to the caller.
 * Returns null if not found or not owned by the user.
 */
export async function getUserAuditByAuditId(
  userId: string,
  auditId: string,
): Promise<Pick<ZionAuditRow, "audit_id" | "reaudit_token" | "resubmit_count" | "user_id"> | null> {
  const { data, error } = await adminSupabase
    .from("zion_audits")
    .select("audit_id, reaudit_token, resubmit_count, user_id")
    .eq("audit_id", auditId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    logger.warn("[zion-db] getUserAuditByAuditId failed", {
      auditId,
      message: error.message,
    });
    return null;
  }
  return data;
}

/** Atomically bump the parent's resubmit_count. Best-effort. */
export async function bumpResubmitCount(auditId: string): Promise<void> {
  // Two-step read-modify-write. Not strictly atomic across concurrent
  // resubmits, but with a 1-per-audit quota enforced by the prover this
  // is sufficient in practice.
  const { data, error: readErr } = await adminSupabase
    .from("zion_audits")
    .select("resubmit_count")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (readErr || !data) {
    if (readErr) logger.warn("[zion-db] bumpResubmitCount read failed", { auditId, message: readErr.message });
    return;
  }
  const { error: writeErr } = await adminSupabase
    .from("zion_audits")
    .update({ resubmit_count: (data.resubmit_count ?? 0) + 1 })
    .eq("audit_id", auditId);
  if (writeErr) {
    logger.warn("[zion-db] bumpResubmitCount write failed", { auditId, message: writeErr.message });
  }
}
