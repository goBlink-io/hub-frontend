import { supabase } from './db';

interface AuditParams {
  actor: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an audit event. Fire-and-forget — does not throw on failure.
 */
export function logAudit(params: AuditParams): void {
  Promise.resolve(
    supabase
      .from('audit_logs')
      .insert({
        actor: params.actor,
        action: params.action,
        resource_type: params.resourceType ?? null,
        resource_id: params.resourceId ?? null,
        metadata: params.metadata ?? {},
        ip_address: params.ipAddress ?? null,
      })
  )
    .then(({ error }) => {
      if (error) {
        console.error('[audit] Failed to log:', error.message, params.action);
      }
    })
    .catch((err: unknown) => {
      console.error('[audit] Unexpected error:', err);
    });
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
