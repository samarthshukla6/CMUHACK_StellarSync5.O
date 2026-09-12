/**
 * Centralized logger utility that gates non-error logs in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors, even in production (for debugging)
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

