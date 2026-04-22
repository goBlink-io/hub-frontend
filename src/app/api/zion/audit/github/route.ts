import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  submitGitHubAudit,
  ZionError,
  isGitHubAuditsEnabled,
} from "@/lib/server/zion";
import { insertAudit } from "@/lib/server/zion-db";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { logger } from "@/lib/logger";
import type { GitHubAuditInput, SuiExecutionMode } from "@/types/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submitLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 3 });

const VALID_SUI_MODES: readonly SuiExecutionMode[] = [
  "parse-only",
  "package-test",
  "devnet-extended",
];

function parseInput(body: unknown): GitHubAuditInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const o = body as Record<string, unknown>;

  const url = typeof o.url === "string" ? o.url.trim() : "";
  if (!url) return { error: "GitHub URL is required" };
  if (url.length > 500) return { error: "URL too long" };
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
      return { error: "Only github.com URLs are accepted" };
    }
  } catch {
    return { error: "Invalid URL" };
  }

  const branch = typeof o.branch === "string" ? o.branch.trim() : "";
  const path = typeof o.path === "string" ? o.path.trim() : "";
  const notifyEmail =
    typeof o.notifyEmail === "string" ? o.notifyEmail.trim() : "";
  const suiExecutionMode =
    typeof o.suiExecutionMode === "string" ? o.suiExecutionMode : undefined;

  if (branch.length > 100) return { error: "Branch too long" };
  if (path.length > 200) return { error: "Path too long" };
  if (notifyEmail.length > 200) return { error: "Email too long" };
  if (
    suiExecutionMode !== undefined &&
    !VALID_SUI_MODES.includes(suiExecutionMode as SuiExecutionMode)
  ) {
    return { error: "Invalid suiExecutionMode" };
  }

  return {
    url,
    branch: branch || undefined,
    path: path || undefined,
    notifyEmail: notifyEmail || undefined,
    suiExecutionMode: suiExecutionMode as SuiExecutionMode | undefined,
  };
}

export async function POST(request: NextRequest) {
  if (!isGitHubAuditsEnabled()) {
    return NextResponse.json(
      { error: "GitHub audits are not enabled" },
      { status: 404 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = submitLimiter.check(user.id);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many audits submitted. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const job = await submitGitHubAudit(parsed);
    await insertAudit({
      userId: user.id,
      job,
      sourceType: "github",
      sourceMeta: {
        githubUrl: parsed.url,
        githubBranch: parsed.branch,
        githubPath: parsed.path,
        suiExecutionMode: parsed.suiExecutionMode,
      },
    });
    return NextResponse.json(job, { status: 202 });
  } catch (err) {
    if (err instanceof ZionError) {
      const headers: Record<string, string> = {};
      if (err.retryAfterSec) headers["Retry-After"] = String(err.retryAfterSec);
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status, headers },
      );
    }
    logger.error("[zion/audit/github] unexpected error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
