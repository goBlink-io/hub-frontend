import { getMerchantAdminClient } from "@/lib/server/merchant-client";

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
 * Log a merchant-scoped audit event. Writes to the Merchant project's
 * `audit_logs` table. Never throws — audit failures are logged but do
 * not break the main flow.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const merchantDb = getMerchantAdminClient();
    const { error } = await merchantDb.from("audit_logs").insert({
      merchant_id: params.merchantId,
      actor: params.actor,
      action: params.action,
      resource_type: params.resourceType ?? null,
      resource_id: params.resourceId ?? null,
      metadata: params.metadata ?? {},
      ip_address: params.ipAddress ?? null,
    });

    if (error) {
      console.error("[merchant-audit] Failed to log:", error.message, params.action);
    }
  } catch (err) {
    console.error(
      "[merchant-audit] Unexpected error:",
      err instanceof Error ? err.message : err,
      params.action,
    );
  }
}
