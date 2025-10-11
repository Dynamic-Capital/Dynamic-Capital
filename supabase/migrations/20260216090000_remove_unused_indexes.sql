-- Drop unused indexes flagged by Supabase lint to reduce write overhead.
-- Retain moderation, chat, AI service log, analytics, and transaction audit indexes that power active queries.
--   idx_abuse_bans_tg, idx_ai_service_logs_*, idx_chat_messages_*, idx_chat_sessions_*,
--   idx_user_analytics_*, idx_ton_tx_*, and idx_tx_logs_* all remain intact.
DROP INDEX IF EXISTS public.idx_domain_cache_expires;
DROP INDEX IF EXISTS public.idx_email_campaigns_scheduled;
DROP INDEX IF EXISTS public.idx_email_campaigns_status;
DROP INDEX IF EXISTS public.idx_email_recipients_campaign;
DROP INDEX IF EXISTS public.idx_email_recipients_email;
DROP INDEX IF EXISTS public.idx_email_recipients_status;
DROP INDEX IF EXISTS public.idx_enrollment_audit_student_id;
DROP INDEX IF EXISTS public.idx_plan_channels_plan_id_active;
DROP INDEX IF EXISTS public.idx_session_audit_telegram_user;
DROP INDEX IF EXISTS public.idx_subdomain_claims_status;
DROP INDEX IF EXISTS public.idx_subdomain_claims_user_id;
DROP INDEX IF EXISTS public.idx_ton_subdomains_subdomain;
DROP INDEX IF EXISTS public.idx_ton_subdomains_user_id;
DROP INDEX IF EXISTS public.idx_ton_subdomains_verified;
