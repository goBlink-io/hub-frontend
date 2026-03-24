import type {
  AuditResponse,
  AuditOptions,
  Pattern,
  Exploit,
  AuditStats,
} from '@/types/audit';

const ZION_API =
  process.env.NEXT_PUBLIC_ZION_API_URL || 'http://localhost:3900';

/**
 * Submit contract files for formal verification audit.
 */
export async function runAudit(
  files: File[],
  options: AuditOptions
): Promise<AuditResponse> {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  formData.append('chain', options.chain);
  formData.append('irAnalysis', String(options.irAnalysis));
  formData.append('patternMatching', String(options.patternMatching));
  formData.append('aiSpecs', String(options.aiSpecs));

  const res = await fetch(`${ZION_API}/api/audit`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Audit failed: ${text}`);
  }

  return res.json() as Promise<AuditResponse>;
}

/**
 * Fetch pre-computed demo audit (Solmate ERC20).
 */
export async function fetchDemo(): Promise<AuditResponse> {
  const res = await fetch(`${ZION_API}/api/demo`);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Demo failed: ${text}`);
  }
  return res.json() as Promise<AuditResponse>;
}

/**
 * Fetch the pattern library from Zion.
 */
export async function getPatterns(): Promise<Pattern[]> {
  const res = await fetch(`${ZION_API}/api/patterns`);
  if (!res.ok) throw new Error(`Failed to fetch patterns: ${res.statusText}`);
  return res.json() as Promise<Pattern[]>;
}

/**
 * Fetch the exploit database from Zion.
 */
export async function getExploits(): Promise<Exploit[]> {
  const res = await fetch(`${ZION_API}/api/exploits`);
  if (!res.ok) throw new Error(`Failed to fetch exploits: ${res.statusText}`);
  return res.json() as Promise<Exploit[]>;
}

/**
 * Fetch aggregate stats from Zion.
 */
export async function getStats(): Promise<AuditStats> {
  const res = await fetch(`${ZION_API}/api/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  return res.json() as Promise<AuditStats>;
}

/**
 * Submit a GitHub URL for audit.
 */
export async function auditFromGithub(url: string): Promise<AuditResponse> {
  const res = await fetch(`${ZION_API}/api/audit/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`GitHub audit failed: ${text}`);
  }

  return res.json() as Promise<AuditResponse>;
}
