import crypto from "crypto";

const COOKIE_SECRET = process.env.COOKIE_SECRET;

function getSecret(): string {
  if (!COOKIE_SECRET) {
    throw new Error("COOKIE_SECRET environment variable is not set");
  }
  return COOKIE_SECRET;
}

/** Sign a payload and return a tamper-proof cookie value: base64(payload).signature */
export function signCookiePayload(payload: Record<string, unknown>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto.createHmac("sha256", getSecret()).update(data).digest("hex");
  return `${data}.${signature}`;
}

/** Verify and parse a signed cookie value. Returns null if invalid or tampered. */
export function verifyCookiePayload<T = Record<string, unknown>>(cookieValue: string): T | null {
  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const data = cookieValue.slice(0, dotIndex);
  const signature = cookieValue.slice(dotIndex + 1);

  const expectedSignature = crypto.createHmac("sha256", getSecret()).update(data).digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data, "base64").toString()) as T;
  } catch {
    return null;
  }
}
