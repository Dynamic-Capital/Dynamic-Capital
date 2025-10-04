-- Harden RLS policies to avoid granting implicit access to the anon role
-- and move shared extensions into a dedicated schema.

-- Ensure pg_net extension lives outside of the public schema
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    EXECUTE 'ALTER EXTENSION pg_net SET SCHEMA extensions;';
  END IF;
END
$$;

-- Restrict helper policies that previously defaulted to the public role
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bot_content','bot_settings','bot_users','broadcast_messages',
    'channel_memberships','contact_links','conversion_tracking','daily_analytics',
    'education_categories','education_enrollments','education_packages','media_files',
    'payments','promo_analytics','promotions','subscription_plans',
    'user_interactions','user_package_assignments','user_sessions',
    'user_subscriptions','user_surveys','admin_logs'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
        AND policyname = 'allow_service_or_admin_all'
    ) THEN
      EXECUTE format(
        'ALTER POLICY allow_service_or_admin_all ON public.%I TO authenticated;',
        t
      );
    END IF;
  END LOOP;
END
$$;

-- Update specific policies so they no longer target the implicit public role
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kv_config'
      AND policyname = 'Service role can manage kv_config'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage kv_config" ON public.kv_config TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kv_config'
      AND policyname = 'Deny anonymous access to kv_config'
  ) THEN
    EXECUTE 'ALTER POLICY "Deny anonymous access to kv_config" ON public.kv_config TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'abuse_bans'
      AND policyname = 'Service role can manage abuse_bans'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage abuse_bans" ON public.abuse_bans TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'abuse_bans'
      AND policyname = 'Deny anonymous access to abuse_bans'
  ) THEN
    EXECUTE 'ALTER POLICY "Deny anonymous access to abuse_bans" ON public.abuse_bans TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'auto_reply_templates'
      AND policyname = 'Bot can manage auto reply templates'
  ) THEN
    EXECUTE 'ALTER POLICY "Bot can manage auto reply templates" ON public.auto_reply_templates TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'auto_reply_templates'
      AND policyname = 'Bot can view active auto reply templates'
  ) THEN
    EXECUTE 'ALTER POLICY "Bot can view active auto reply templates" ON public.auto_reply_templates TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bot_content'
      AND policyname = 'Anyone can view active bot content'
  ) THEN
    EXECUTE 'ALTER POLICY "Anyone can view active bot content" ON public.bot_content TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bank_accounts'
      AND policyname = 'Only admins can view bank accounts'
  ) THEN
    EXECUTE 'ALTER POLICY "Only admins can view bank accounts" ON public.bank_accounts TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bank_accounts'
      AND policyname = 'Admins can manage bank accounts'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage bank accounts" ON public.bank_accounts TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plan_channels'
      AND policyname = 'Admins can manage plan channels'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage plan channels" ON public.plan_channels TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plan_channels'
      AND policyname = 'Public can view plan channels'
  ) THEN
    EXECUTE 'ALTER POLICY "Public can view plan channels" ON public.plan_channels TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bot_settings'
      AND policyname = 'Service role can manage bot settings'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage bot settings" ON public.bot_settings TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bot_settings'
      AND policyname = 'Authenticated users can read active settings'
  ) THEN
    EXECUTE 'ALTER POLICY "Authenticated users can read active settings" ON public.bot_settings TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bot_users'
      AND policyname = 'Admins can view all bot users'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view all bot users" ON public.bot_users TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bot_users'
      AND policyname = 'Users can view their own bot user record'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own bot user record" ON public.bot_users TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'broadcast_messages'
      AND policyname = 'Service role can manage broadcast messages'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage broadcast messages" ON public.broadcast_messages TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channel_memberships'
      AND policyname = 'Admins can manage all memberships'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage all memberships" ON public.channel_memberships TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channel_memberships'
      AND policyname = 'Users can view their own memberships'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own memberships" ON public.channel_memberships TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_messages'
      AND policyname = 'Service role can manage all chat messages'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage all chat messages" ON public.chat_messages TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_messages'
      AND policyname = 'Users can view messages from their sessions'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view messages from their sessions" ON public.chat_messages TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_sessions'
      AND policyname = 'Service role can manage all chat sessions'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage all chat sessions" ON public.chat_sessions TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_sessions'
      AND policyname = 'Users can update their own chat sessions'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can update their own chat sessions" ON public.chat_sessions TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_sessions'
      AND policyname = 'Users can view their own chat sessions'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own chat sessions" ON public.chat_sessions TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_links'
      AND policyname = 'Anyone can view active contact links'
  ) THEN
    EXECUTE 'ALTER POLICY "Anyone can view active contact links" ON public.contact_links TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_links'
      AND policyname = 'Bot can manage contact links'
  ) THEN
    EXECUTE 'ALTER POLICY "Bot can manage contact links" ON public.contact_links TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversion_tracking'
      AND policyname = 'Service role can manage conversion tracking'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage conversion tracking" ON public.conversion_tracking TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_analytics'
      AND policyname = 'Service role can manage daily analytics'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage daily analytics" ON public.daily_analytics TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'domain_resolution_cache'
      AND policyname = 'Anyone can read domain cache'
  ) THEN
    EXECUTE 'ALTER POLICY "Anyone can read domain cache" ON public.domain_resolution_cache TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'domain_resolution_cache'
      AND policyname = 'Service role can manage domain cache'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage domain cache" ON public.domain_resolution_cache TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'education_categories'
      AND policyname = 'Anyone can view active categories'
  ) THEN
    EXECUTE 'ALTER POLICY "Anyone can view active categories" ON public.education_categories TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'education_categories'
      AND policyname = 'Bot can manage categories'
  ) THEN
    EXECUTE 'ALTER POLICY "Bot can manage categories" ON public.education_categories TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'education_enrollments'
      AND policyname = 'Admins can manage all education enrollments'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage all education enrollments" ON public.education_enrollments TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'education_enrollments'
      AND policyname = 'Service role can manage education enrollments'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage education enrollments" ON public.education_enrollments TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'education_packages'
      AND policyname = 'Anyone can view active packages'
  ) THEN
    EXECUTE 'ALTER POLICY "Anyone can view active packages" ON public.education_packages TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'education_packages'
      AND policyname = 'Bot can manage packages'
  ) THEN
    EXECUTE 'ALTER POLICY "Bot can manage packages" ON public.education_packages TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_campaigns'
      AND policyname = 'Admins can manage campaigns'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage campaigns" ON public.email_campaigns TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_campaigns'
      AND policyname = 'Users can view their own campaigns'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own campaigns" ON public.email_campaigns TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_recipients'
      AND policyname = 'Admins can manage recipients'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage recipients" ON public.email_recipients TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_recipients'
      AND policyname = 'Users can view recipients of their campaigns'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view recipients of their campaigns" ON public.email_recipients TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_templates'
      AND policyname = 'Admins can manage templates'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage templates" ON public.email_templates TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_templates'
      AND policyname = 'Anyone can view active templates'
  ) THEN
    EXECUTE 'ALTER POLICY "Anyone can view active templates" ON public.email_templates TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'enrollment_audit_log'
      AND policyname = 'Only admins can view all enrollment audit logs'
  ) THEN
    EXECUTE 'ALTER POLICY "Only admins can view all enrollment audit logs" ON public.enrollment_audit_log TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'enrollment_audit_log'
      AND policyname = 'Users can view own enrollment audit logs'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view own enrollment audit logs" ON public.enrollment_audit_log TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'media_files'
      AND policyname = 'Admins can view all media files'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view all media files" ON public.media_files TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'media_files'
      AND policyname = 'Users can view their own media files'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own media files" ON public.media_files TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_intents'
      AND policyname = 'Service role can manage payment intents'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage payment intents" ON public.payment_intents TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_intents'
      AND policyname = 'Users can view their own payment intents'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own payment intents" ON public.payment_intents TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payments'
      AND policyname = 'Admins can view all payments'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view all payments" ON public.payments TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payments'
      AND policyname = 'Users can view their own payments'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own payments" ON public.payments TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'promo_analytics'
      AND policyname = 'Service role can manage promo analytics'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage promo analytics" ON public.promo_analytics TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'promotion_usage'
      AND policyname = 'Service role can manage promotion usage'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage promotion usage" ON public.promotion_usage TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'promotions'
      AND policyname = 'Anyone can view active promotions'
  ) THEN
    EXECUTE 'ALTER POLICY "Anyone can view active promotions" ON public.promotions TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'promotions'
      AND policyname = 'Bot can manage promotions'
  ) THEN
    EXECUTE 'ALTER POLICY "Bot can manage promotions" ON public.promotions TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_audit_log'
      AND policyname = 'Only admins can view session audit logs'
  ) THEN
    EXECUTE 'ALTER POLICY "Only admins can view session audit logs" ON public.session_audit_log TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_audit_log'
      AND policyname = 'Users can view own session audit logs'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view own session audit logs" ON public.session_audit_log TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subdomain_claims'
      AND policyname = 'Admins can manage all claims'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage all claims" ON public.subdomain_claims TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subdomain_claims'
      AND policyname = 'Users can view their own claims'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own claims" ON public.subdomain_claims TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_audit_log'
      AND policyname = 'Only admins can view subscription audit logs'
  ) THEN
    EXECUTE 'ALTER POLICY "Only admins can view subscription audit logs" ON public.subscription_audit_log TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_plans'
      AND policyname = 'Anyone can view subscription plans'
  ) THEN
    EXECUTE 'ALTER POLICY "Anyone can view subscription plans" ON public.subscription_plans TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ton_subdomains'
      AND policyname = 'Admins can view all subdomains'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view all subdomains" ON public.ton_subdomains TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ton_subdomains'
      AND policyname = 'Service role can manage subdomains'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage subdomains" ON public.ton_subdomains TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ton_subdomains'
      AND policyname = 'Users can view their own subdomains'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own subdomains" ON public.ton_subdomains TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ton_transactions'
      AND policyname = 'Admins can view all transactions'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view all transactions" ON public.ton_transactions TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ton_transactions'
      AND policyname = 'Service role can manage transactions'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage transactions" ON public.ton_transactions TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ton_transactions'
      AND policyname = 'Users can view their own transactions'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own transactions" ON public.ton_transactions TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_analytics'
      AND policyname = 'Admins can view all analytics'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view all analytics" ON public.user_analytics TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_package_assignments'
      AND policyname = 'Admins can manage all assignments'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage all assignments" ON public.user_package_assignments TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_sessions'
      AND policyname = 'Admins can manage all user sessions'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage all user sessions" ON public.user_sessions TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_sessions'
      AND policyname = 'Service role can manage user sessions'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage user sessions" ON public.user_sessions TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
      AND policyname = 'Admins can manage all subscriptions'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can manage all subscriptions" ON public.user_subscriptions TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
      AND policyname = 'Admins can view all subscriptions'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view all subscriptions" ON public.user_subscriptions TO authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
      AND policyname = 'Service role can manage user subscriptions'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage user subscriptions" ON public.user_subscriptions TO service_role;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_surveys'
      AND policyname = 'Service role can manage user surveys'
  ) THEN
    EXECUTE 'ALTER POLICY "Service role can manage user surveys" ON public.user_surveys TO service_role;';
  END IF;
END
$$;

-- Harden cron schema policies to service role only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'cron' AND tablename = 'job') THEN
    EXECUTE 'ALTER TABLE cron.job ENABLE ROW LEVEL SECURITY;';
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'cron'
        AND tablename = 'job'
        AND policyname = 'cron_job_policy'
    ) THEN
      EXECUTE 'ALTER POLICY cron_job_policy ON cron.job TO service_role;';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'cron' AND tablename = 'job_run_details') THEN
    EXECUTE 'ALTER TABLE cron.job_run_details ENABLE ROW LEVEL SECURITY;';
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'cron'
        AND tablename = 'job_run_details'
        AND policyname = 'cron_job_run_details_policy'
    ) THEN
      EXECUTE 'ALTER POLICY cron_job_run_details_policy ON cron.job_run_details TO service_role;';
    END IF;
  END IF;
END
$$;

-- Lock down storage bucket policies so only authenticated users can read miniapp files
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read access for miniapp files'
  ) THEN
    EXECUTE 'ALTER POLICY "Public read access for miniapp files" ON storage.objects TO authenticated;';
  END IF;
END
$$;
