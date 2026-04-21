import type {
  AuditResponse,
  AuditSourceMeta,
  AuditSourceType,
} from "@/types/audit";

/** Shape of a row in the admin audits list (user_id exposed). */
export interface AdminAuditListItem {
  id: string;
  user_id: string;
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
  resubmit_count: number;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface AdminAuditListResponse {
  audits: AdminAuditListItem[];
  total: number;
  limit: number;
  offset: number;
}

/** Full row returned by the admin detail endpoint. Includes the result JSON. */
export interface AdminAuditRow extends AdminAuditListItem {
  result: AuditResponse | null;
  reaudit_token: string | null;
  updated_at: string;
}

export interface AdminAuditDetailResponse {
  audit: AdminAuditRow;
}
