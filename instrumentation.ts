const sentryModule = '@sentry/nextjs';

export function register() {
  let Sentry;
  try {
    // Load optional Sentry SDK at runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Sentry = require(sentryModule);
  } catch {
    return;
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}
