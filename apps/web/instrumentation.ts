export async function register() {
  // Disable Sentry during the production build to avoid React context errors
  if (process.env.NODE_ENV === 'production') return;

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
