# Supabase Database Function Catalogue

## Application-Visible RPC Inventory

The generated Supabase client types enumerate the RPC surface that the web and
edge layers expect to call. This catalogue cross-references those generated
signatures with the SQL definitions that live in the checked-in migrations so
you can quickly confirm which routines are version-controlled and which still
need source of truth in Git.【F:apps/web/types/supabase.ts†L2194-L2355】

## Role & Identity Helpers

| Function                                         | Purpose & Security                                                                                                                                                                                                                              | Migration                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `get_current_user_role()`                        | Returns the caller's profile role for RLS checks via a stable `SECURITY DEFINER` SQL helper.【F:supabase/migrations/20250906040937_d3737afd-1b12-47c4-bb90-6d81009b7b6c.sql†L6-L20】                                                            | `20250906040937_d3737afd…`             |
| `is_current_user_admin()`                        | Wraps the role helper so policies can assert admin privileges without exposing raw profile rows; implemented as a stable security-definer SQL function.【F:supabase/migrations/20250821003343_644eebd9-bead-468d-8058-fa1665cf8cb4.sql†L7-L37】 | `20250821003343_644eebd9…`             |
| `get_current_user_telegram_id()`                 | Provides the caller's Telegram handle from `profiles`, letting downstream queries scope data per-user safely.【F:supabase/migrations/20250907203202_a1d105c1-8d8f-4193-800a-7823aa229aaf.sql†L4-L32】                                           | `20250907203202_a1d105c1…`             |
| `get_user_role(user_telegram_id)`                | Looks up another member's role for admin tooling using a stable security-definer SQL helper.【F:supabase/migrations/20250912000200_add_user_role_helpers.sql†L1-L12】                                                                           | `20250912000200_add_user_role_helpers` |
| `is_user_admin(user_telegram_id)`                | Leverages `get_user_role` to expose a boolean admin check for Telegram users.【F:supabase/migrations/20250912000200_add_user_role_helpers.sql†L14-L23】                                                                                         | `20250912000200_add_user_role_helpers` |
| `is_telegram_admin(telegram_user_id)`            | Confirms a Telegram handle's admin flag from `bot_users` under a security-definer SQL function for RLS decisions.【F:supabase/migrations/20250907100459_3231c94b-2362-4b05-bdba-aacd2d7c1da5.sql†L4-L17】                                       | `20250907100459_3231c94b…`             |
| `get_user_subscription_status(telegram_user_id)` | Aggregates VIP status, plan metadata, renewal timing, and payment health into a single RPC response for dashboards.【F:supabase/migrations/20250907100459_3231c94b-2362-4b05-bdba-aacd2d7c1da5.sql†L19-L52】                                    | `20250907100459_3231c94b…`             |

## Privacy & Session Hygiene

| Function                                                  | Purpose & Security                                                                                                                                                                                                       | Migration                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| `get_masked_enrollment_info(enrollment_id)`               | Delivers enrollment data with full fidelity for admins and redacted PII for regular users via a security-definer SQL function.【F:supabase/migrations/20250907203202_a1d105c1-8d8f-4193-800a-7823aa229aaf.sql†L87-L148】 | `20250907203202_a1d105c1…` |
| `anonymize_enrollment_data(enrollment_id, admin_user_id)` | Lets administrators scramble stored PII while logging the operation for compliance reporting.【F:supabase/migrations/20250907203202_a1d105c1-8d8f-4193-800a-7823aa229aaf.sql†L203-L269】                                 | `20250907203202_a1d105c1…` |
| `log_enrollment_access()`                                 | Trigger function that writes audit records whenever enrollments are touched by authenticated users.【F:supabase/migrations/20250907203202_a1d105c1-8d8f-4193-800a-7823aa229aaf.sql†L278-L311】                           | `20250907203202_a1d105c1…` |
| `get_masked_session_info(session_id)`                     | Returns either the full session payload or a redacted summary depending on whether the caller owns the session or is an admin.【F:supabase/migrations/20250907202806_762cd2e5-a509-4232-a6b4-f373109ffd29.sql†L77-L124】 | `20250907202806_762cd2e5…` |
| `cleanup_old_sessions(cleanup_hours)`                     | Ends stale sessions, logs a summary row, and returns cleanup metadata from a security-definer PL/pgSQL routine.【F:supabase/migrations/20250907202806_762cd2e5-a509-4232-a6b4-f373109ffd29.sql†L175-L225】               | `20250907202806_762cd2e5…` |
| `get_masked_subscription_info(subscription_id)`           | Masks payment channel details for regular users while presenting the full record to administrators.【F:supabase/migrations/20250907202601_fc3b748f-9af9-4e64-9dea-78858ff18801.sql†L85-L139】                            | `20250907202601_fc3b748f…` |

## Analytics & Promotions

| Function                                                 | Purpose & Security                                                                                                                                                                                                               | Migration                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `track_user_event(...)`                                  | Persists granular analytics events (session, agent, referrer context) into `user_analytics` using a security-definer PL/pgSQL routine.【F:supabase/migrations/20250907200029_95f54b34-d037-442a-be55-a41af9d3955c.sql†L74-L111】 | `20250907200029_95f54b34…`                            |
| `get_user_analytics_summary(p_telegram_user_id, p_days)` | Returns a JSON aggregate of recent activity, counts, and time windows for dashboards.【F:supabase/migrations/20250907200029_95f54b34-d037-442a-be55-a41af9d3955c.sql†L113-L152】                                                 | `20250907200029_95f54b34…`                            |
| `validate_promo_code(p_code, p_telegram_user_id)`        | Evaluates promo eligibility and emits a structured verdict with reason codes and discount payload.【F:supabase/migrations/20250828233733_e428f668-345c-45ec-b9d1-ab474d3086fe.sql†L1-L45】                                       | `20250828233733_e428f668…`                            |
| `record_promo_usage(p_promotion_id, p_telegram_user_id)` | Inserts usage records and increments redemption counters atomically after validation.【F:supabase/migrations/20250828233733_e428f668-345c-45ec-b9d1-ab474d3086fe.sql†L48-L65】                                                   | `20250828233733_e428f668…`                            |
| `get_bot_content_batch(content_keys[])`                  | Fetches active bot content in bulk to minimise round-trips during conversational flows.【F:supabase/migrations/20250808071000_add_bot_settings_and_batch_functions.sql†L57-L66】                                                 | `20250808071000_add_bot_settings_and_batch_functions` |
| `get_bot_settings_batch(setting_keys[])`                 | Retrieves multiple bot settings simultaneously for efficient runtime configuration.【F:supabase/migrations/20250808071000_add_bot_settings_and_batch_functions.sql†L68-L76】                                                     | `20250808071000_add_bot_settings_and_batch_functions` |

## Trading & Operational Integrations

| Function                                            | Purpose & Security                                                                                                                                                                                                             | Migration                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `count_executed_signals_since(p_start)`             | Counts executed trading signals after a timestamp to support mentor feedback analytics.【F:supabase/migrations/20251022090000_add_mentor_feedback_table.sql†L14-L24】                                                          | `20251022090000_add_mentor_feedback_table` |
| `claim_trading_signal(p_worker_id, p_account_code)` | Atomically locks and assigns the next pending trading signal to a worker, creating a dispatch trail under a security-definer PL/pgSQL function.【F:supabase/migrations/20250920000000_trading_signals_pipeline.sql†L200-L272】 | `20250920000000_trading_signals_pipeline`  |
| `mark_trading_signal_status(...)`                   | Updates signal state, audit timestamps, and dispatch metadata once a worker reports progress or errors.【F:supabase/migrations/20250920000000_trading_signals_pipeline.sql†L274-L335】                                         | `20250920000000_trading_signals_pipeline`  |
| `record_trade_update(...)`                          | Creates or upserts MT5 trade records tied to signals, keeping execution payloads and lifecycle timestamps in sync.【F:supabase/migrations/20250920000000_trading_signals_pipeline.sql†L338-L419】                              | `20250920000000_trading_signals_pipeline`  |

## Security & Platform Utilities

| Function                       | Purpose & Security                                                                                                                                                                                      | Migration                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `get_webhook_secret_secure()`  | Enforces service-role-only access to the Telegram webhook secret while raising exceptions for other roles.【F:supabase/migrations/20250821003343_644eebd9-bead-468d-8058-fa1665cf8cb4.sql†L96-L110】    | `20250821003343_644eebd9…`                               |
| `check_extensions_in_public()` | Lists extensions installed in the `public` schema so operators can detect drift from baseline configuration.【F:supabase/migrations/20250915000000_add_check_extensions_in_public_function.sql†L1-L11】 | `20250915000000_add_check_extensions_in_public_function` |

## Trigger & Timestamp Utilities

| Function                     | Purpose & Security                                                                                                                                                                              | Migration                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `update_updated_at_column()` | Legacy trigger helper that stamps `updated_at` columns before updates; still referenced by historical triggers.【F:supabase/migrations/20250807023345_navy_boat.sql†L204-L217】                 | `20250807023345_navy_boat`                 |
| `handle_updated_at()`        | Shared trigger installed across tables to maintain `updated_at` while cleaning up references to the legacy helper.【F:supabase/migrations/20250814000000_handle_updated_at_trigger.sql†L1-L36】 | `20250814000000_handle_updated_at_trigger` |
| `set_updated_at()`           | PL/pgSQL trigger used to stamp `updated_at` via a migration-time sweep across core tables.【F:supabase/migrations/20250816_harden_fk_rls_indexes.sql†L92-L116】                                 | `20250816_harden_fk_rls_indexes`           |
| `orders_set_updated_at()`    | Order-specific trigger wrapper to ensure `updated_at` refreshes on financial order changes.【F:supabase/migrations/20251105090000_bank_to_dct_core.sql†L201-L213】                              | `20251105090000_bank_to_dct_core`          |

## Functions Referenced by Generated Types Without Checked-In SQL

The following RPC names still appear in the generated Supabase types but do not
have corresponding definitions in the migrations directory. Confirm their
existence directly in Supabase (or add migrations) before adopting them in new
features: `add_admin`, `batch_insert_user_interactions`,
`cleanup_old_media_files`, `generate_uuid`, `get_bot_stats`,
`get_dashboard_stats_fast`, `get_masked_payment_info`,
`get_remaining_security_notes`, `get_security_recommendations`,
`get_user_complete_data`, `is_service_role`, `is_valid_otp_timeframe`,
`make_secure_http_request`, `update_daily_analytics`, and
`validate_telegram_user_id`.【F:apps/web/types/supabase.ts†L2194-L2355】
