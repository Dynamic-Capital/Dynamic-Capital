if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  (async () => {
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init({
        dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 1.0,
      });
    } catch {
      // Sentry SDK not available; skip initialization
    }
  })();
}
