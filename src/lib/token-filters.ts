/**
 * Tokens hidden from all token selectors (obscure/meme/incomplete).
 * Single source of truth — imported by SwapForm, PaymentModal, etc.
 */
export const HIDDEN_TOKEN_SYMBOLS = new Set([
  'ABG', 'ADI', 'ALEO', 'APT', 'BERA', 'BLACKDRAGON', 'BOME', 'BRETT',
  'cbBTC', 'CFI', 'EURe', 'FMS', 'GBPe', 'HAPI', 'INX', 'ITLX', 'JAMBO',
  'KAITO', 'LOUD', 'MELANIA', 'MOG', 'mpDAO', 'NearKat', 'NPRO', 'PENGU',
  'PUBLIC', 'PURGE', 'RHEA', 'SAFE', 'SPX', 'SWEAT', 'TITN', 'TRUMP',
  'TURBO', 'USD1', 'USDf',
]);

export const filterTokens = <T extends { symbol: string }>(list: T[]): T[] =>
  list.filter(t => !HIDDEN_TOKEN_SYMBOLS.has(t.symbol));
