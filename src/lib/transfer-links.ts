/**
 * transfer-links.ts
 * Encode/decode completed transfer details into URL-safe base64 strings.
 * Format: goblink.io/t/{base64url(JSON)}
 */

export interface TransferLinkData {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOut: string;
  amountInUsd?: string;
  depositAddress?: string;
  elapsedSeconds?: number;
  feeUsd?: number | null;
  timestamp: number;
}

/** Encode transfer data into a URL-safe base64 string */
export function encodeTransferLink(data: TransferLinkData): string {
  try {
    const json = JSON.stringify(data);
    // btoa with URL-safe replacements
    const b64 = typeof window !== 'undefined'
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, 'utf8').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

/** Decode a URL-safe base64 string back into transfer data */
export function decodeTransferLink(encoded: string): TransferLinkData | null {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
    const json = typeof window !== 'undefined'
      ? decodeURIComponent(escape(atob(padded)))
      : Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed?.fromChain || !parsed?.toChain) return null;
    return parsed as TransferLinkData;
  } catch {
    return null;
  }
}

/** Generate the full shareable URL */
export function generateTransferUrl(data: TransferLinkData, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://goblink.io');
  const encoded = encodeTransferLink(data);
  return encoded ? `${base}/t/${encoded}` : base;
}

/** Human-readable elapsed time */
export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
