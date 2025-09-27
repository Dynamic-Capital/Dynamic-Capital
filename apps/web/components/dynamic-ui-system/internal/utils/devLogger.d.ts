/**
 * Logger utility that only logs in development mode
 * Use this instead of console.log for debugging messages that
 * should not appear in production
 */
export declare const dev: {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
};
//# sourceMappingURL=devLogger.d.ts.map
