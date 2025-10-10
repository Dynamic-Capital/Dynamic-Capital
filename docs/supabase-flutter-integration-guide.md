# Supabase Flutter Integration Guide

This guide documents how Dynamic Capital can integrate Flutter clients with the
existing Supabase backend. It references the upstream
[`supabase-flutter` repository](https://github.com/supabase/supabase-flutter)
and aligns the Flutter tooling with our current infrastructure standards.

## Objectives

- Provide a repeatable setup process for Flutter developers targeting Supabase
  services.
- Ensure authentication, storage, and real-time features respect Dynamic Capital
  security policies.
- Define observability, testing, and release expectations for mobile clients.

## Prerequisites

1. Flutter SDK 3.19+ with the stable channel configured.
2. Supabase CLI installed locally for environment management.
3. Access to the Dynamic Capital Supabase project and service role keys
   provisioned through Vault.
4. Familiarity with the
   [`supabase_flutter` package](https://pub.dev/packages/supabase_flutter) and
   our [Mini App Supabase deployment runbooks](./MINI_APP_ON_SUPABASE.md).

## Project Bootstrapping

1. Initialize a new Flutter application:

   ```bash
   flutter create dynamic_supabase_client
   cd dynamic_supabase_client
   ```

2. Add Supabase dependencies following the upstream guidance:

   ```bash
   flutter pub add supabase_flutter gotrue realtime storage
   ```

3. Generate the Supabase configuration file:

   ```bash
   supabase init
   supabase link --project-ref <PROJECT_REF>
   supabase secrets set FLUTTER_REDIRECT_URI="io.dynamic.app://login-callback"
   ```

4. Store the anonymous key and URL in `lib/env.dart` using our configuration
   helper pattern. Never commit raw credentials; update `env.example.dart`
   instead.

## Authentication Flow

- Use Magic Link and OTP flows from `supabase_flutter` to mirror the Telegram
  Mini App login. Persist sessions with `SharedPreferences` and refresh tokens
  automatically.
- Enforce RLS policies by ensuring every API call uses the authenticated
  `SupabaseClient` instance created at app startup.
- Log sign-in and sign-out events to the telemetry topic defined in
  `SUPABASE_LOG_STREAMING.md`.

## Storage and Data Sync

- Leverage the `storage` package for uploading receipts and compliance
  documents. Apply the bucket naming and retention conventions outlined in
  `dynamic-capital-extended-integration-playbook.md`.
- Subscribe to real-time channels for risk alerts. Prefix channels with the team
  namespace, e.g., `quant.alerts.<desk>`.

## Testing and QA

- Write widget tests covering Supabase auth guards and optimistic UI updates.
- Run the Flutter analyzer and unit tests in CI:

  ```bash
  flutter analyze
  flutter test
  ```

- Incorporate integration tests using the Supabase emulator before submitting a
  release candidate build.

## Observability

- Forward Supabase client logs to our structured logging sink via the
  `supabase_flutter` `logLevel` configuration.
- Capture critical failures with Sentry or Firebase Crashlytics and correlate
  them with Supabase request IDs.

## Release Checklist

1. Update environment variables in Vault and refresh the mobile config bundle.
2. Verify that Supabase migrations linked to the Flutter feature are applied in
   staging.
3. Run the Mini App regression suite and ensure no breaking changes to shared
   Supabase schemas.
4. Submit the Flutter build to the relevant app stores following the
   `dynamic-ui-development-checklist.md` guidelines.

## References

- Supabase Flutter GitHub repository:
  <https://github.com/supabase/supabase-flutter>
- Supabase mobile quickstart:
  <https://supabase.com/docs/guides/getting-started/quickstarts/flutter>
- Dynamic Capital Supabase telemetry playbook: `SUPABASE_LOG_STREAMING.md`
