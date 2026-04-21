/**
 * Server-side client for the zion-prover HTTP API.
 *
 * All calls are authenticated with a server-held bearer token
 * (`ZION_API_TOKEN`). The bearer is never forwarded to the browser — every
 * caller is a Next.js route handler that proxies the response back out.
 *
 * Design notes:
 * - Lazy init: config is resolved on first use, not at import time, so
 *   `next build` can collect page data without env vars.
 * - Multipart: callers pass a `FormData` whose `File` entries are streamed
 *   directly into the upstream request. We do not buffer file bytes.
 * - Errors: non-2xx responses throw `ZionError` with status + body. The
 *   202 polling status from the prover is surfaced as `status: "running"`
 *   in `getJob`, not as an error.
 */

import { logger } from "@/lib/logger";
import type {
  AuditResponse,
  GitHubAuditInput,
  JobCreated,
  JobStatus,
  ReportFormat,
  ResubmitStatus,
  ZionExploit,
  ZionPattern,
  ZionStats,
} from "@/types/audit";

export class ZionError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body?: unknown;
  readonly retryAfterSec?: number;

  constructor(params: {
    message: string;
    status: number;
    code?: string;
    body?: unknown;
    retryAfterSec?: number;
  }) {
    super(params.message);
    this.name = "ZionError";
    this.status = params.status;
    this.code = params.code;
    this.body = params.body;
    this.retryAfterSec = params.retryAfterSec;
  }
}

interface ZionConfig {
  baseUrl: string;
  token: string;
  githubAuditsEnabled: boolean;
  requestTimeoutMs: number;
  reportTimeoutMs: number;
}

let _config: ZionConfig | null = null;

function getConfig(): ZionConfig {
  if (_config) return _config;
  const baseUrl = process.env.ZION_API_BASE_URL?.replace(/\/$/, "");
  const token = process.env.ZION_API_TOKEN;
  if (!baseUrl) {
    throw new ZionError({
      message: "ZION_API_BASE_URL is not configured",
      status: 503,
      code: "prover_unconfigured",
    });
  }
  if (!token) {
    throw new ZionError({
      message: "ZION_API_TOKEN is not configured",
      status: 503,
      code: "prover_unconfigured",
    });
  }
  _config = {
    baseUrl,
    token,
    githubAuditsEnabled: process.env.ZION_GITHUB_AUDITS_ENABLED === "true",
    requestTimeoutMs: parseInt(process.env.ZION_REQUEST_TIMEOUT_MS || "30000", 10),
    reportTimeoutMs: parseInt(process.env.ZION_REPORT_TIMEOUT_MS || "60000", 10),
  };
  return _config;
}

export function isGitHubAuditsEnabled(): boolean {
  try {
    return getConfig().githubAuditsEnabled;
  } catch {
    return false;
  }
}

function authHeaders(cfg: ZionConfig, extra?: Record<string, string>): HeadersInit {
  return { Authorization: `Bearer ${cfg.token}`, ...(extra || {}) };
}

async function parseError(res: Response): Promise<ZionError> {
  const retryAfter = res.headers.get("retry-after");
  const retryAfterSec = retryAfter ? parseInt(retryAfter, 10) : undefined;
  let body: unknown;
  const contentType = res.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      body = await res.json();
    } else {
      body = await res.text();
    }
  } catch {
    body = undefined;
  }
  const message =
    (body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : undefined) || `Prover responded ${res.status}`;
  return new ZionError({
    message,
    status: res.status,
    body,
    retryAfterSec: Number.isFinite(retryAfterSec) ? retryAfterSec : undefined,
  });
}

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  // Clear the timer once the signal is consumed so we don't leak handles.
  controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  return controller.signal;
}

async function proverFetch(
  path: string,
  init: RequestInit & { timeoutMs?: number; cacheRevalidateSec?: number } = {},
): Promise<Response> {
  const cfg = getConfig();
  const { timeoutMs, cacheRevalidateSec, headers, ...rest } = init;
  const url = `${cfg.baseUrl}${path}`;
  const mergedHeaders: HeadersInit = {
    ...authHeaders(cfg),
    ...(headers || {}),
  };
  const fetchOpts: RequestInit = {
    ...rest,
    headers: mergedHeaders,
    signal: withTimeout(timeoutMs ?? cfg.requestTimeoutMs),
  };
  if (typeof cacheRevalidateSec === "number") {
    (fetchOpts as RequestInit & { next?: { revalidate?: number } }).next = {
      revalidate: cacheRevalidateSec,
    };
  }
  try {
    return await fetch(url, fetchOpts);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ZionError({
        message: "Prover request timed out",
        status: 504,
        code: "prover_timeout",
      });
    }
    logger.error("[zion] fetch failed", { path, err: String(err) });
    throw new ZionError({
      message: "Prover unreachable",
      status: 502,
      code: "prover_unreachable",
    });
  }
}

async function proverJson<T>(path: string, init?: Parameters<typeof proverFetch>[1]): Promise<T> {
  const res = await proverFetch(path, init);
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

/* ----------------------------- Public methods ---------------------------- */

export async function getStats(): Promise<ZionStats> {
  return proverJson<ZionStats>("/api/stats", { cacheRevalidateSec: 60 });
}

export async function getPatterns(): Promise<ZionPattern[]> {
  return proverJson<ZionPattern[]>("/api/patterns", { cacheRevalidateSec: 300 });
}

export async function getExploits(): Promise<ZionExploit[]> {
  return proverJson<ZionExploit[]>("/api/exploits", { cacheRevalidateSec: 300 });
}

export async function getDemo(): Promise<AuditResponse> {
  return proverJson<AuditResponse>("/api/demo", { cacheRevalidateSec: 60 });
}

export async function health(): Promise<{ status: string; version: string; uptime: number }> {
  return proverJson("/api/health", { cacheRevalidateSec: 30 });
}

/* --------------------------- Authed audit flow --------------------------- */

/**
 * Submit a file-upload audit. `form` must contain one or more `files` entries.
 * Optional fields: `notifyEmail`, `webhookUrl`, `suiExecutionMode`.
 */
export async function submitAudit(form: FormData): Promise<JobCreated> {
  // `fetch` will set the multipart Content-Type with boundary when body is FormData.
  const res = await proverFetch("/api/audit", { method: "POST", body: form });
  if (res.status !== 202 && !res.ok) throw await parseError(res);
  return (await res.json()) as JobCreated;
}

export async function submitGitHubAudit(input: GitHubAuditInput): Promise<JobCreated> {
  const cfg = getConfig();
  if (!cfg.githubAuditsEnabled) {
    throw new ZionError({
      message: "GitHub audits are disabled",
      status: 404,
      code: "github_audits_disabled",
    });
  }
  const res = await proverFetch("/api/audit/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status !== 202 && !res.ok) throw await parseError(res);
  return (await res.json()) as JobCreated;
}

/**
 * Poll a job's status.
 *
 * The prover returns HTTP 202 while the job is queued or running, and HTTP
 * 200 with `{status: "completed", result: ...}` when done. We normalise both
 * to a discriminated `JobStatus` so callers do not branch on status codes.
 */
export async function getJob(jobId: string): Promise<JobStatus> {
  const res = await proverFetch(`/api/audit/jobs/${encodeURIComponent(jobId)}`, {
    method: "GET",
    timeoutMs: 10_000,
  });
  if (res.status === 202) {
    const body = (await res.json().catch(() => ({}))) as Partial<JobStatus> & {
      status?: string;
    };
    return {
      jobId,
      status: body.status === "running" ? "running" : "queued",
      ...body,
    } as JobStatus;
  }
  if (res.status === 500) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    return {
      jobId,
      status: "failed",
      error: { message: body.error || "Audit failed", code: body.code },
    };
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as JobStatus;
}

export async function getReport(
  jobId: string,
  format: ReportFormat,
): Promise<{
  contentType: string;
  contentDisposition: string | null;
  body: ReadableStream<Uint8Array> | null;
  status: number;
}> {
  const cfg = getConfig();
  const res = await proverFetch(
    `/api/audit/jobs/${encodeURIComponent(jobId)}/report?format=${encodeURIComponent(format)}`,
    { method: "GET", timeoutMs: cfg.reportTimeoutMs },
  );
  // Let 409 / 503 / 200 pass through; only treat other non-2xx as errors.
  if (res.status !== 200 && res.status !== 409 && res.status !== 503) {
    if (!res.ok) throw await parseError(res);
  }
  return {
    contentType: res.headers.get("content-type") || "application/octet-stream",
    contentDisposition: res.headers.get("content-disposition"),
    body: res.body,
    status: res.status,
  };
}

export async function resubmit(form: FormData): Promise<JobCreated> {
  const res = await proverFetch("/api/audit/resubmit", { method: "POST", body: form });
  if (res.status !== 202 && !res.ok) throw await parseError(res);
  return (await res.json()) as JobCreated;
}

export async function getResubmitStatus(auditId: string): Promise<ResubmitStatus> {
  return proverJson<ResubmitStatus>(
    `/api/audit/resubmit-status/${encodeURIComponent(auditId)}`,
  );
}

/* ----------------------- Public embeds (badge / cert) -------------------- */

export async function getBadgeSvg(auditId: string): Promise<{ body: string; etag: string | null }> {
  const res = await proverFetch(`/api/audit/badge/${encodeURIComponent(auditId)}`, {
    method: "GET",
    timeoutMs: 10_000,
    cacheRevalidateSec: 86400,
  });
  if (!res.ok) throw await parseError(res);
  return { body: await res.text(), etag: res.headers.get("etag") };
}

export async function getCertificateHtml(
  auditId: string,
): Promise<{ body: string; etag: string | null }> {
  const res = await proverFetch(`/api/audit/certificate/${encodeURIComponent(auditId)}`, {
    method: "GET",
    timeoutMs: 10_000,
    cacheRevalidateSec: 86400,
  });
  if (!res.ok) throw await parseError(res);
  return { body: await res.text(), etag: res.headers.get("etag") };
}
