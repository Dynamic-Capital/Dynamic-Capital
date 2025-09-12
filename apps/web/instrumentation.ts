import { registerOTel } from '@vercel/otel';

export async function register() {
  // Ensure Next.js' OpenTelemetry context is registered first to avoid null context errors
  registerOTel();

  // Only enable Sentry when explicitly requested and not during production build
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_SENTRY !== 'true'
  ) {
    return;
  }

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
