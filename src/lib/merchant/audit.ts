import { adminSupabase } from "@/lib/server/db";

interface AuditParams {
  merchantId: string;
  actor: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an audit event. Never throws — audit failures are logged but do not break the main flow.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const { error } = await adminSupabase
      .from("audit_logs")
      .insert({
        merchant_id: params.merchantId,
        actor: params.actor,
        action: params.action,
        resource_type: params.resourceType ?? null,
        resource_id: params.resourceId ?? null,
        metadata: params.metadata ?? {},
        ip_address: params.ipAddress ?? null,
      });

    if (error) {
      console.error("[audit] Failed to log:", error.message, params.action);
    }
  } catch (err) {
    console.error("[audit] Unexpected error:", err instanceof Error ? err.message : err, params.action);
  }
}
