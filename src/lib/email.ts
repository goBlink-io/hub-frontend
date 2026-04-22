/**
 * Transactional email sender.
 *
 * Provider: Resend. Chosen because it has a minimal API, native React
 * Email support, and a free tier generous enough for invites + nudges.
 *
 * The @resend/node package is dynamic-imported so an install is only
 * required for deployments that actually want to send email. When
 * RESEND_API_KEY is unset, send() resolves to `{ ok: false, reason }`
 * and the caller logs it — invites still work (the link is always
 * returned to the API response so the inviter can share it manually).
 *
 * To enable in a deployment:
 *   1. `pnpm add resend`
 *   2. Set RESEND_API_KEY, EMAIL_FROM.
 *
 * Required env:
 *   RESEND_API_KEY   — your Resend API key
 *   EMAIL_FROM       — "goBlink <no-reply@your-domain.tld>"
 *                      (the domain must be verified in Resend)
 *
 * Optional env:
 *   EMAIL_REPLY_TO   — reply-to address for transactional mail
 */

import { reportError } from "@/lib/error-reporting";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Override the default From for this send. */
  from?: string;
  replyTo?: string;
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: string };

interface ResendBridge {
  emails: {
    send(payload: {
      from: string;
      to: string | string[];
      subject: string;
      html: string;
      text?: string;
      reply_to?: string;
    }): Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>;
  };
}

let resendPromise: Promise<ResendBridge | null> | null = null;

function loadResend(): Promise<ResendBridge | null> {
  if (resendPromise) return resendPromise;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    resendPromise = Promise.resolve(null);
    return resendPromise;
  }

  resendPromise = (async () => {
    try {
      const spec = "resend";
      const dynamicImport = new Function("s", "return import(s)") as (
        s: string,
      ) => Promise<{ Resend: new (apiKey: string) => ResendBridge }>;
      const mod = await dynamicImport(spec);
      return new mod.Resend(apiKey);
    } catch (err) {
      reportError(err, { module: "email", reason: "resend-load-failed" });
      return null;
    }
  })();

  return resendPromise;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = input.from ?? process.env.EMAIL_FROM;
  if (!from) {
    return { ok: false, reason: "EMAIL_FROM not configured" };
  }

  const resend = await loadResend();
  if (!resend) {
    return { ok: false, reason: "RESEND_API_KEY not set or resend package missing" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo ?? process.env.EMAIL_REPLY_TO,
    });

    if (error) {
      return { ok: false, reason: error.message ?? "Unknown Resend error" };
    }

    return { ok: true, id: data?.id ?? "unknown" };
  } catch (err) {
    reportError(err, { module: "email", to: input.to, subject: input.subject });
    return { ok: false, reason: err instanceof Error ? err.message : "send failed" };
  }
}

// ── Templates ─────────────────────────────────────────────────────────────
//
// Kept inline rather than pulled into MJML / React Email to avoid adding
// more dependencies. The HTML is intentionally minimal and inlines all
// styles (most email clients strip <style> blocks).

export function renderTeamInviteEmail(params: {
  spaceName: string;
  inviterName?: string;
  role: "admin" | "editor" | "viewer";
  acceptUrl: string;
}): { subject: string; html: string; text: string } {
  const inviter = params.inviterName?.trim() || "Someone";
  const roleTitle = params.role[0].toUpperCase() + params.role.slice(1);

  const subject = `${inviter} invited you to ${params.spaceName} on BlinkBook`;

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7f9;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <tr>
            <td style="padding:32px">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:600">You're invited to ${escapeHtml(params.spaceName)}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155">
                ${escapeHtml(inviter)} invited you to join <strong>${escapeHtml(params.spaceName)}</strong>
                as a <strong>${roleTitle}</strong> on BlinkBook.
              </p>
              <p style="margin:24px 0">
                <a href="${escapeAttr(params.acceptUrl)}"
                   style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:500">
                  Accept invitation
                </a>
              </p>
              <p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.5">
                If the button doesn't work, paste this link into your browser:<br>
                <span style="color:#334155;word-break:break-all">${escapeHtml(params.acceptUrl)}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;color:#64748b">
              This invitation was sent by a BlinkBook workspace admin.
              If you weren't expecting it, you can safely ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `${inviter} invited you to ${params.spaceName} on BlinkBook as ${roleTitle}.`,
    "",
    `Accept: ${params.acceptUrl}`,
    "",
    "If you weren't expecting this, you can safely ignore this email.",
  ].join("\n");

  return { subject, html, text };
}

export function renderAuditCompleteEmail(params: {
  auditLabel: string;
  status: "completed" | "failed";
  grade: string | null;
  score: number | null;
  errorMessage: string | null;
  detailUrl: string;
}): { subject: string; html: string; text: string } {
  const isDone = params.status === "completed";
  const subject = isDone
    ? `Audit complete: ${params.auditLabel}${params.grade ? ` (grade ${params.grade})` : ""}`
    : `Audit failed: ${params.auditLabel}`;

  const summary = isDone
    ? `Your audit finished successfully${
        params.grade ? ` with a grade of <strong>${escapeHtml(params.grade)}</strong>` : ""
      }${params.score !== null ? ` (${params.score}/100)` : ""}.`
    : `Your audit couldn't be completed${
        params.errorMessage ? `: ${escapeHtml(params.errorMessage)}` : "."
      }`;

  const summaryText = isDone
    ? `Your audit finished successfully${params.grade ? ` with a grade of ${params.grade}` : ""}${
        params.score !== null ? ` (${params.score}/100)` : ""
      }.`
    : `Your audit couldn't be completed${params.errorMessage ? `: ${params.errorMessage}` : "."}`;

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7f9;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <tr>
            <td style="padding:32px">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:600">${escapeHtml(subject)}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155">
                <strong>Target:</strong> ${escapeHtml(params.auditLabel)}
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155">
                ${summary}
              </p>
              <p style="margin:24px 0">
                <a href="${escapeAttr(params.detailUrl)}"
                   style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:500">
                  View report
                </a>
              </p>
              <p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.5">
                Link: <span style="color:#334155;word-break:break-all">${escapeHtml(params.detailUrl)}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    subject,
    "",
    `Target: ${params.auditLabel}`,
    summaryText,
    "",
    `View: ${params.detailUrl}`,
  ].join("\n");

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
