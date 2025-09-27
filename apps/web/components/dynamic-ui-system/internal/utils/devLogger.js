"use client";
/**
 * Logger utility that only logs in development mode
 * Use this instead of console.log for debugging messages that
 * should not appear in production
 */
export const dev = {
  log: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.error(...args);
    }
  },
  info: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.info(...args);
    }
  },
  debug: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(...args);
    }
  },
};
//# sourceMappingURL=devLogger.js.map
