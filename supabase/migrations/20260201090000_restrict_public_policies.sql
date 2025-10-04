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

-- Make sure the cron tables enforce RLS before adjusting their policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'cron' AND tablename = 'job'
  ) THEN
    EXECUTE 'ALTER TABLE cron.job ENABLE ROW LEVEL SECURITY;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'cron' AND tablename = 'job_run_details'
  ) THEN
    EXECUTE 'ALTER TABLE cron.job_run_details ENABLE ROW LEVEL SECURITY;';
  END IF;
END
$$;

-- Consolidate policy role updates so we only touch existing policies
DO $$
DECLARE
  ddl text;
BEGIN
  FOR ddl IN
    WITH policy_targets AS (
      SELECT
        'public'::text AS schema_name,
        table_name,
        'allow_service_or_admin_all'::text AS policy_name,
        ARRAY['authenticated']::text[] AS roles
      FROM unnest(ARRAY[
        'admin_logs',
        'bot_content','bot_settings','bot_users','broadcast_messages',
        'channel_memberships','contact_links','conversion_tracking','daily_analytics',
        'education_categories','education_enrollments','education_packages','media_files',
        'payments','promo_analytics','promotions','subscription_plans',
        'user_interactions','user_package_assignments','user_sessions',
        'user_subscriptions','user_surveys'
      ]) AS table_name
      UNION ALL
      SELECT * FROM (VALUES
        -- Cron policies
        ('cron','job','cron_job_policy', ARRAY['service_role']::text[]),
        ('cron','job_run_details','cron_job_run_details_policy', ARRAY['service_role']::text[]),

        -- Storage bucket access
        ('storage','objects','Admins can delete broadcast media', ARRAY['authenticated']::text[]),
        ('storage','objects','Admins can view broadcast media', ARRAY['authenticated']::text[]),
        ('storage','objects','Anyone can view temp uploads', ARRAY['authenticated']::text[]),
        ('storage','objects','Bot can delete media', ARRAY['service_role']::text[]),
        ('storage','objects','Bot can update media', ARRAY['service_role']::text[]),
        ('storage','objects','Bot can update receipts', ARRAY['service_role']::text[]),
        ('storage','objects','Bot can view media', ARRAY['service_role']::text[]),
        ('storage','objects','Bot can view receipts', ARRAY['service_role']::text[]),
        ('storage','objects','Public read access for miniapp files', ARRAY['authenticated']::text[]),
        ('storage','objects','Service role can delete temp uploads', ARRAY['service_role']::text[]),

        -- Public schema tightening
        ('public','abuse_bans','Deny anonymous access to abuse_bans', ARRAY['authenticated']::text[]),
        ('public','abuse_bans','Service role can manage abuse_bans', ARRAY['service_role']::text[]),
        ('public','admin_logs','Admins can view admin logs', ARRAY['authenticated']::text[]),
        ('public','auto_reply_templates','Bot can manage auto reply templates', ARRAY['service_role']::text[]),
        ('public','auto_reply_templates','Bot can view active auto reply templates', ARRAY['authenticated']::text[]),
        ('public','bank_accounts','Admins can manage bank accounts', ARRAY['authenticated']::text[]),
        ('public','bank_accounts','Only admins can view bank accounts', ARRAY['authenticated']::text[]),
        ('public','bot_content','Anyone can view active bot content', ARRAY['authenticated']::text[]),
        ('public','bot_sessions','Admins can view all sessions', ARRAY['authenticated']::text[]),
        ('public','bot_sessions','Users can view their own sessions', ARRAY['authenticated']::text[]),
        ('public','bot_settings','Authenticated users can read active settings', ARRAY['authenticated']::text[]),
        ('public','bot_settings','Service role can manage bot settings', ARRAY['service_role']::text[]),
        ('public','bot_users','Admins can view all bot users', ARRAY['authenticated']::text[]),
        ('public','bot_users','Users can view their own bot user record', ARRAY['authenticated']::text[]),
        ('public','broadcast_messages','Service role can manage broadcast messages', ARRAY['service_role']::text[]),
        ('public','channel_memberships','Admins can manage all memberships', ARRAY['authenticated']::text[]),
        ('public','channel_memberships','Users can view their own memberships', ARRAY['authenticated']::text[]),
        ('public','chat_messages','Service role can manage all chat messages', ARRAY['service_role']::text[]),
        ('public','chat_messages','Users can view messages from their sessions', ARRAY['authenticated']::text[]),
        ('public','chat_sessions','Service role can manage all chat sessions', ARRAY['service_role']::text[]),
        ('public','chat_sessions','Users can update their own chat sessions', ARRAY['authenticated']::text[]),
        ('public','chat_sessions','Users can view their own chat sessions', ARRAY['authenticated']::text[]),
        ('public','contact_links','Anyone can view active contact links', ARRAY['authenticated']::text[]),
        ('public','contact_links','Bot can manage contact links', ARRAY['service_role']::text[]),
        ('public','conversion_tracking','Service role can manage conversion tracking', ARRAY['service_role']::text[]),
        ('public','daily_analytics','Service role can manage daily analytics', ARRAY['service_role']::text[]),
        ('public','domain_resolution_cache','Anyone can read domain cache', ARRAY['authenticated']::text[]),
        ('public','domain_resolution_cache','Service role can manage domain cache', ARRAY['service_role']::text[]),
        ('public','education_categories','Anyone can view active categories', ARRAY['authenticated']::text[]),
        ('public','education_categories','Bot can manage categories', ARRAY['service_role']::text[]),
        ('public','education_enrollments','Admins can manage all education enrollments', ARRAY['authenticated']::text[]),
        ('public','education_enrollments','Service role can manage education enrollments', ARRAY['service_role']::text[]),
        ('public','education_enrollments','Users can update own enrollments only', ARRAY['authenticated']::text[]),
        ('public','education_enrollments','Users can view own enrollments only', ARRAY['authenticated']::text[]),
        ('public','education_packages','Anyone can view active packages', ARRAY['authenticated']::text[]),
        ('public','education_packages','Bot can manage packages', ARRAY['service_role']::text[]),
        ('public','email_campaigns','Admins can manage campaigns', ARRAY['authenticated']::text[]),
        ('public','email_campaigns','Users can view their own campaigns', ARRAY['authenticated']::text[]),
        ('public','email_recipients','Admins can manage recipients', ARRAY['authenticated']::text[]),
        ('public','email_recipients','Users can view recipients of their campaigns', ARRAY['authenticated']::text[]),
        ('public','email_templates','Admins can manage templates', ARRAY['authenticated']::text[]),
        ('public','email_templates','Anyone can view active templates', ARRAY['authenticated']::text[]),
        ('public','enrollment_audit_log','Only admins can view all enrollment audit logs', ARRAY['authenticated']::text[]),
        ('public','enrollment_audit_log','Users can view own enrollment audit logs', ARRAY['authenticated']::text[]),
        ('public','kv_config','Deny anonymous access to kv_config', ARRAY['authenticated']::text[]),
        ('public','kv_config','Service role can manage kv_config', ARRAY['service_role']::text[]),
        ('public','media_files','Admins can view all media files', ARRAY['authenticated']::text[]),
        ('public','media_files','Users can view their own media files', ARRAY['authenticated']::text[]),
        ('public','payment_intents','Service role can manage payment intents', ARRAY['service_role']::text[]),
        ('public','payment_intents','Users can view their own payment intents', ARRAY['authenticated']::text[]),
        ('public','payments','Admins can view all payments', ARRAY['authenticated']::text[]),
        ('public','payments','Users can view their own payments', ARRAY['authenticated']::text[]),
        ('public','plan_channels','Admins can manage plan channels', ARRAY['authenticated']::text[]),
        ('public','plan_channels','Public can view plan channels', ARRAY['authenticated']::text[]),
        ('public','profiles','Admins can update all profiles', ARRAY['authenticated']::text[]),
        ('public','profiles','Admins can view all profiles', ARRAY['authenticated']::text[]),
        ('public','profiles','Users can update their own profile', ARRAY['authenticated']::text[]),
        ('public','profiles','Users can view their own profile', ARRAY['authenticated']::text[]),
        ('public','promo_analytics','Service role can manage promo analytics', ARRAY['service_role']::text[]),
        ('public','promotion_usage','Service role can manage promotion usage', ARRAY['service_role']::text[]),
        ('public','promotions','Anyone can view active promotions', ARRAY['authenticated']::text[]),
        ('public','promotions','Bot can manage promotions', ARRAY['service_role']::text[]),
        ('public','session_audit_log','Only admins can view session audit logs', ARRAY['authenticated']::text[]),
        ('public','session_audit_log','Users can view own session audit logs', ARRAY['authenticated']::text[]),
        ('public','subdomain_claims','Admins can manage all claims', ARRAY['authenticated']::text[]),
        ('public','subdomain_claims','Users can view their own claims', ARRAY['authenticated']::text[]),
        ('public','subscription_audit_log','Only admins can view subscription audit logs', ARRAY['authenticated']::text[]),
        ('public','subscription_plans','Anyone can view subscription plans', ARRAY['authenticated']::text[]),
        ('public','ton_subdomains','Admins can view all subdomains', ARRAY['authenticated']::text[]),
        ('public','ton_subdomains','Service role can manage subdomains', ARRAY['service_role']::text[]),
        ('public','ton_subdomains','Users can view their own subdomains', ARRAY['authenticated']::text[]),
        ('public','ton_transactions','Admins can view all transactions', ARRAY['authenticated']::text[]),
        ('public','ton_transactions','Service role can manage transactions', ARRAY['service_role']::text[]),
        ('public','ton_transactions','Users can view their own transactions', ARRAY['authenticated']::text[]),
        ('public','user_analytics','Admins can view all analytics', ARRAY['authenticated']::text[]),
        ('public','user_interactions','Admins can view all interactions', ARRAY['authenticated']::text[]),
        ('public','user_interactions','Users can view their own interactions', ARRAY['authenticated']::text[]),
        ('public','user_package_assignments','Admins can manage all assignments', ARRAY['authenticated']::text[]),
        ('public','user_package_assignments','Users can view their own assignments', ARRAY['authenticated']::text[]),
        ('public','user_sessions','Admins can manage all user sessions', ARRAY['authenticated']::text[]),
        ('public','user_sessions','Service role can manage user sessions', ARRAY['service_role']::text[]),
        ('public','user_sessions','Users can update own sessions only', ARRAY['authenticated']::text[]),
        ('public','user_sessions','Users can view own sessions only', ARRAY['authenticated']::text[]),
        ('public','user_subscriptions','Admins can manage all subscriptions', ARRAY['authenticated']::text[]),
        ('public','user_subscriptions','Admins can view all subscriptions', ARRAY['authenticated']::text[]),
        ('public','user_subscriptions','Service role can manage user subscriptions', ARRAY['service_role']::text[]),
        ('public','user_subscriptions','Users can update their own subscription details', ARRAY['authenticated']::text[]),
        ('public','user_subscriptions','Users can view their own subscriptions', ARRAY['authenticated']::text[]),
        ('public','user_surveys','Service role can manage user surveys', ARRAY['service_role']::text[])
      ) AS explicit(schema_name, table_name, policy_name, roles)
    ),
    policy_role_lists AS (
      SELECT
        pt.schema_name,
        pt.table_name,
        pt.policy_name,
        string_agg(format('%I', role_name), ', ' ORDER BY ord) AS role_list
      FROM policy_targets pt
      CROSS JOIN LATERAL unnest(pt.roles) WITH ORDINALITY AS roles(role_name, ord)
      GROUP BY pt.schema_name, pt.table_name, pt.policy_name
    )
    SELECT format(
      'ALTER POLICY %I ON %I.%I TO %s;',
      pr.policy_name,
      pr.schema_name,
      pr.table_name,
      pr.role_list
    )
    FROM policy_role_lists pr
    JOIN pg_policies p
      ON p.schemaname = pr.schema_name
     AND p.tablename = pr.table_name
     AND p.policyname = pr.policy_name
  LOOP
    EXECUTE ddl;
  END LOOP;
END
$$;
