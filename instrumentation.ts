export async function register() {
  // Skip Sentry initialization during the Next.js build phase to avoid
  // issues when React isn't fully available (e.g. missing useContext).
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  try {
    const Sentry =
      typeof window === 'undefined'
        ? await import('@sentry/nextjs')
        : await import('@sentry/browser');
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
    });
  } catch {
    // Sentry SDK not installed; skip initialization
  }
}
