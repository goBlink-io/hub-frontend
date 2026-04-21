/**
 * Client-shaped view of the zion_audits row, as returned by
 * GET /api/zion/audits. Mirrors the columns we expose via SELECT.
 */

import type { AuditSourceMeta, AuditSourceType } from "@/types/audit";

export type ZionAuditListItem = {
  id: string;
  job_id: string | null;
  audit_id: string | null;
  status: "queued" | "running" | "completed" | "failed";
  source_type: AuditSourceType;
  source_meta: AuditSourceMeta;
  chain: string | null;
  language: string | null;
  security_score: number | null;
  grade: string | null;
  parent_audit_id: string | null;
  created_at: string;
  completed_at: string | null;
};

export interface ZionAuditListResponse {
  audits: ZionAuditListItem[];
}
