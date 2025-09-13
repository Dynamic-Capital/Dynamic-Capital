import { registerInstrumentations } from '@opentelemetry/instrumentation';

export async function register() {
  // Ensure Next.js' OpenTelemetry context is registered first to avoid null context errors
  try {
    const { registerOTel } = await import('@vercel/otel');
    registerOTel();
  } catch {
    // Optional dependency not installed; continue without OpenTelemetry registration
  }
  // Register OpenTelemetry instrumentations to avoid dynamic import warnings
  registerInstrumentations({ instrumentations: [] });

  // Only enable Sentry when explicitly requested and not during production build
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_SENTRY !== 'true'
  ) {
    return;
  }

  try {
    // Use a dynamic import that is ignored by webpack so that Sentry's
    // optional peer dependencies (which contain dynamic `require` calls)
    // are not bundled during compilation. This suppresses "Critical
    // dependency" warnings emitted by webpack when building the app.
    const Sentry =
      typeof window === 'undefined'
        ? await import(
            /* webpackIgnore: true */ '@sentry/nextjs'
          )
        : await import(
            /* webpackIgnore: true */ '@sentry/browser'
          );
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
    });
  } catch {
    // Sentry SDK not installed; skip initialization
  }
}
