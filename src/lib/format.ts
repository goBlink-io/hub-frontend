/**
 * Format a token amount string for human display.
 * - Strips excess decimal precision (e.g. "0.0020007062515905309" → "0.00200071")
 * - Never produces scientific notation
 * - Shows up to maxSigFigs significant digits for small values
 */
export function formatTokenAmount(value: string | number | undefined | null, maxSigFigs = 6): string {
  if (value === undefined || value === null || value === '') return '0';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n) || n === 0) return '0';

  // Large numbers: use locale formatting with up to 2 decimals
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  // Medium numbers: up to 4 decimals
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });

  // Small numbers: calculate decimal places needed for maxSigFigs significant figures
  // e.g. 0.0020007 with 6 sig figs → 8 decimal places → "0.00200071"
  const magnitude = Math.floor(Math.log10(Math.abs(n)));
  const decimals = Math.min(Math.max(0, -magnitude + maxSigFigs - 1), 12);
  return n.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}
