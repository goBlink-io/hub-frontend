/**
 * Logging utility.
 * - error/warn: always log (Vercel captures console output in function logs)
 * - info/debug: development only (prevent noisy production logs)
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: any[]) => {
    if (isDev) console.log('[INFO]', ...args);
  },

  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  debug: (...args: any[]) => {
    if (isDev) console.debug('[DEBUG]', ...args);
  },
};
