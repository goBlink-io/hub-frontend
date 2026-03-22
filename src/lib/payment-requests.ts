/**
 * payment-requests.ts
 * Encode/decode payment request data for cross-chain payment links.
 * Format: goblink.io/pay/{base64url(JSON)}
 */

export interface PaymentRequestData {
  /** Address that should receive the payment */
  recipient: string;
  /** Destination chain ID */
  toChain: string;
  /** Desired token symbol on destination */
  toToken: string;
  /** Human-readable amount (e.g. "50") */
  amount: string;
  /** Optional memo / note */
  memo?: string;
  /** Display name for the requester (optional) */
  name?: string;
  /** Created at timestamp */
  createdAt: number;
}

/** Encode payment request into a URL-safe base64 string */
export function encodePaymentRequest(data: PaymentRequestData): string {
  try {
    const json = JSON.stringify(data);
    const b64 = typeof window !== 'undefined'
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, 'utf8').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

/** Decode a URL-safe base64 string back into payment request data */
export function decodePaymentRequest(encoded: string): PaymentRequestData | null {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
    const json = typeof window !== 'undefined'
      ? decodeURIComponent(escape(atob(padded)))
      : Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed?.recipient || !parsed?.toChain || !parsed?.toToken || !parsed?.amount) return null;
    return parsed as PaymentRequestData;
  } catch {
    return null;
  }
}

/** Generate the full payment request URL */
export function generatePaymentUrl(data: PaymentRequestData, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://goblink.io');
  const encoded = encodePaymentRequest(data);
  return encoded ? `${base}/pay/${encoded}` : base;
}

/** Shorten an address for display */
export function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
