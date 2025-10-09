# Supabase Database Function Catalogue

## Application-Visible RPC Inventory

The generated Supabase client types enumerate the RPC surface that the web and
edge layers expect to call, including helpers such as `get_current_user_role`,
masking utilities, promo-code workflows, and analytics
writers.【F:apps/web/types/supabase.ts†L2222-L2356】

## Security & Privacy Routines

| Function                                                  | Summary                                                                                                                                                                                                                                | Security Mode                   | Definition Source          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------- |
| `get_current_user_role()`                                 | Returns the authenticated profile's `role`, enabling policy predicates to avoid leaking elevated access to normal members.【F:supabase/migrations/20250821003343_644eebd9-bead-468d-8058-fa1665cf8cb4.sql†L1-L27】                     | `SECURITY DEFINER` (stable SQL) | `20250821003343_644eebd9…` |
| `get_current_user_telegram_id()`                          | Looks up the caller's Telegram identifier from `profiles`, giving downstream policies a stable identity key for per-user filtering.【F:supabase/migrations/20250907203202_a1d105c1-8d8f-4193-800a-7823aa229aaf.sql†L4-L31】            | `SECURITY DEFINER` (stable SQL) | `20250907203202_a1d105c1…` |
| `get_masked_enrollment_info(enrollment_id)`               | Delivers enrollment details with context-aware masking so regular users only see redacted contact data while admins receive the full record.【F:supabase/migrations/20250907203202_a1d105c1-8d8f-4193-800a-7823aa229aaf.sql†L88-L148】 | `SECURITY DEFINER` (stable SQL) | `20250907203202_a1d105c1…` |
| `anonymize_enrollment_data(enrollment_id, admin_user_id)` | Allows administrators to scramble PII for a specific enrollment and logs the action for auditability.【F:supabase/migrations/20250907203202_a1d105c1-8d8f-4193-800a-7823aa229aaf.sql†L203-L268】                                       | `SECURITY DEFINER` (PL/pgSQL)   | `20250907203202_a1d105c1…` |
| `log_enrollment_access()`                                 | Trigger handler that records enrollment touches (insert/update) into `enrollment_audit_log` whenever a real user interacts with the record.【F:supabase/migrations/20250907203202_a1d105c1-8d8f-4193-800a-7823aa229aaf.sql†L277-L311】 | `SECURITY DEFINER` trigger      | `20250907203202_a1d105c1…` |
| `get_masked_session_info(session_id)`                     | Returns either full or redacted session state depending on whether the caller is an admin or the record owner.【F:supabase/migrations/20250907202806_762cd2e5-a509-4232-a6b4-f373109ffd29.sql†L77-L123】                               | `SECURITY DEFINER` (stable SQL) | `20250907202806_762cd2e5…` |
| `cleanup_old_sessions(cleanup_hours)`                     | Automatically closes stale active sessions, logs the cleanup metadata, and returns a JSON summary of rows touched.【F:supabase/migrations/20250907202806_762cd2e5-a509-4232-a6b4-f373109ffd29.sql†L175-L225】                          | `SECURITY DEFINER` (PL/pgSQL)   | `20250907202806_762cd2e5…` |
| `get_masked_subscription_info(subscription_id)`           | Provides masked payment channel data to regular users while giving admins a full subscription payload.【F:supabase/migrations/20250907202601_fc3b748f-9af9-4e64-9dea-78858ff18801.sql†L86-L138】                                       | `SECURITY DEFINER` (stable SQL) | `20250907202601_fc3b748f…` |
| `is_telegram_admin(telegram_user_id)`                     | Checks the `bot_users` table to confirm whether a Telegram handle holds admin privileges, which drives policy gates and UI toggles.【F:supabase/migrations/20250907100459_3231c94b-2362-4b05-bdba-aacd2d7c1da5.sql†L6-L17】            | `SECURITY DEFINER` (stable SQL) | `20250907100459_3231c94b…` |
| `get_user_subscription_status(telegram_user_id)`          | Aggregates VIP status, plan metadata, remaining days, and payment health into a single RPC response for client dashboards.【F:supabase/migrations/20250907100459_3231c94b-2362-4b05-bdba-aacd2d7c1da5.sql†L20-L52】                    | `SECURITY DEFINER` (stable SQL) | `20250907100459_3231c94b…` |

## Analytics, Promotions & Bot Helpers

| Function                                                 | Summary                                                                                                                                                                                                                       | Security Mode                   | Definition Source                                     |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `track_user_event(...)`                                  | Persists granular analytics events (including session, agent, and referrer context) into `user_analytics` for downstream reporting.【F:supabase/migrations/20250907200029_95f54b34-d037-442a-be55-a41af9d3955c.sql†L74-L111】 | `SECURITY DEFINER` (PL/pgSQL)   | `20250907200029_95f54b34…`                            |
| `get_user_analytics_summary(telegram_user_id, p_days)`   | Builds an aggregated JSON response summarizing total events, session counts, and last activity over a rolling window.【F:supabase/migrations/20250907200029_95f54b34-d037-442a-be55-a41af9d3955c.sql†L113-L152】              | `SECURITY DEFINER` (PL/pgSQL)   | `20250907200029_95f54b34…`                            |
| `get_bot_content_batch(content_keys[])`                  | Fetches active bot content entries in bulk to minimize round-trips during conversational flows.【F:supabase/migrations/20250808071000_add_bot_settings_and_batch_functions.sql†L57-L66】                                      | `SECURITY DEFINER` (stable SQL) | `20250808071000_add_bot_settings_and_batch_functions` |
| `get_bot_settings_batch(setting_keys[])`                 | Returns multiple bot settings in one call so clients can hydrate runtime configuration efficiently.【F:supabase/migrations/20250808071000_add_bot_settings_and_batch_functions.sql†L68-L77】                                  | `SECURITY DEFINER` (stable SQL) | `20250808071000_add_bot_settings_and_batch_functions` |
| `validate_promo_code(p_code, p_telegram_user_id)`        | Evaluates promo eligibility, emitting a structured verdict with failure reasons and discount payload when applicable.【F:supabase/migrations/20250828233733_e428f668-345c-45ec-b9d1-ab474d3086fe.sql†L1-L46】                 | `SECURITY DEFINER` (PL/pgSQL)   | `20250828233733_e428f668…`                            |
| `record_promo_usage(p_promotion_id, p_telegram_user_id)` | Inserts a usage record and bumps promotion counters, ensuring redemption tallies stay in sync.【F:supabase/migrations/20250828233733_e428f668-345c-45ec-b9d1-ab474d3086fe.sql†L48-L65】                                       | `SECURITY DEFINER` (PL/pgSQL)   | `20250828233733_e428f668…`                            |

## Trigger Utilities

| Function                     | Summary                                                                                                                                                     | Security Mode              | Definition Source          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------- |
| `update_updated_at_column()` | Generic trigger used across numerous tables to stamp `updated_at` on each update operation.【F:supabase/migrations/20250807023345_navy_boat.sql†L200-L217】 | `SECURITY DEFINER` trigger | `20250807023345_navy_boat` |

## Functions Referenced by Clients Without Checked-In SQL

The type-safe client schema still references additional RPC names—such as
`add_admin`, `batch_insert_user_interactions`, `check_extensions_in_public`,
`cleanup_old_media_files`, `generate_uuid`, `get_bot_stats`,
`get_dashboard_stats_fast`, `get_masked_payment_info`,
`get_remaining_security_notes`, `get_security_recommendations`,
`get_user_complete_data`, `get_user_role`, `is_service_role`, `is_user_admin`,
`is_valid_otp_timeframe`, `make_secure_http_request`, `update_daily_analytics`,
and `validate_telegram_user_id`—but their definitions do not appear in the
committed migrations. Confirm their deployment status inside Supabase before
relying on them in new features.【F:apps/web/types/supabase.ts†L2222-L2356】
