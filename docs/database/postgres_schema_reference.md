# PostgreSQL Schema Reference

This reference captures the primary keys, unique constraints, and secondary
indexes that were enumerated for the `public` schema. Use it as a quick lookup
when optimizing queries or planning migrations.

## Table-by-table breakdown

### `public.abuse_bans`

- **Primary key:** `abuse_bans_pkey`
- **Unique constraints:** `abuse_bans_telegram_id_key`,
  `abuse_bans_telegram_id_key1`
- **Indexes:** `idx_abuse_bans_tg`

### `public.admin_logs`

- **Primary key:** `admin_logs_pkey`
- **Indexes:** `idx_admin_logs_action_type`, `idx_admin_logs_admin_telegram_id`,
  `idx_admin_logs_created_at`

### `public.auto_reply_templates`

- **Primary key:** `auto_reply_templates_pkey`
- **Indexes:** `idx_auto_reply_templates_active`,
  `idx_auto_reply_templates_created_at`, `idx_auto_reply_templates_is_active`,
  `idx_auto_reply_templates_trigger_type`

### `public.bank_accounts`

- **Primary key:** `bank_accounts_pkey`

### `public.bot_content`

- **Primary key:** `bot_content_pkey`
- **Unique constraints:** `bot_content_content_key_key`
- **Indexes:** `idx_bot_content_key`, `idx_bot_content_key_active`

### `public.bot_sessions`

- **Primary key:** `bot_sessions_pkey`
- **Indexes:** `idx_bot_sessions_active`, `idx_bot_sessions_created_at`,
  `idx_bot_sessions_session_start`, `idx_bot_sessions_telegram_user_id`,
  `idx_bot_sessions_user_active`

### `public.bot_settings`

- **Primary key:** `bot_settings_pkey`
- **Unique constraints:** `bot_settings_setting_key_key`
- **Indexes:** `idx_bot_settings_key`, `idx_bot_settings_key_active`

### `public.bot_users`

- **Primary key:** `bot_users_pkey`
- **Unique constraints:** `bot_users_telegram_id_key`
- **Indexes:** `idx_admin_stats_composite`, `idx_bot_users_active_admin`,
  `idx_bot_users_admin_vip`, `idx_bot_users_created_at`,
  `idx_bot_users_current_plan_id`, `idx_bot_users_is_admin`,
  `idx_bot_users_is_vip`, `idx_bot_users_telegram_id`,
  `idx_bot_users_telegram_id_lookup`, `idx_bot_users_vip_admin`

### `public.broadcast_messages`

- **Primary key:** `broadcast_messages_pkey`
- **Indexes:** `idx_broadcast_messages_media_file_id`,
  `idx_broadcast_messages_scheduled`, `idx_broadcast_messages_status`

### `public.channel_memberships`

- **Primary key:** `channel_memberships_pkey`
- **Unique constraints:** `channel_memberships_telegram_user_id_channel_id_key`
- **Indexes:** `idx_channel_memberships_added_by`,
  `idx_channel_memberships_package_id`, `idx_memberships_channel_id`,
  `idx_memberships_telegram_user_id`, `idx_memberships_user_id`

### `public.chat_messages`

- **Primary key:** `chat_messages_pkey`
- **Indexes:** `idx_chat_messages_created_at`, `idx_chat_messages_session_id`

### `public.chat_sessions`

- **Primary key:** `chat_sessions_pkey`
- **Indexes:** `idx_chat_sessions_telegram_id`, `idx_chat_sessions_user_id`

### `public.contact_links`

- **Primary key:** `contact_links_pkey`
- **Unique constraints:** `contact_links_platform_key`

### `public.conversion_tracking`

- **Primary key:** `conversion_tracking_pkey`

### `public.daily_analytics`

- **Primary key:** `daily_analytics_pkey`
- **Unique constraints:** `daily_analytics_date_key`
- **Indexes:** `idx_daily_analytics_date`

### `public.domain_resolution_cache`

- **Primary key:** `domain_resolution_cache_pkey`
- **Indexes:** `idx_domain_cache_expires`

### `public.education_categories`

- **Primary key:** `education_categories_pkey`

### `public.education_enrollments`

- **Primary key:** `education_enrollments_pkey`
- **Unique constraints:**
  `education_enrollments_package_id_student_telegram_id_key`
- **Indexes:** `idx_education_enrollments_package_id`,
  `idx_education_enrollments_package_status`,
  `idx_education_enrollments_status`,
  `idx_education_enrollments_student_telegram_id`,
  `idx_education_enrollments_telegram_status`,
  `idx_education_enrollments_telegram_user_id`

### `public.education_packages`

- **Primary key:** `education_packages_pkey`
- **Indexes:** `idx_education_packages_active`,
  `idx_education_packages_category_id`

### `public.email_campaigns`

- **Primary key:** `email_campaigns_pkey`
- **Indexes:** `idx_email_campaigns_scheduled`, `idx_email_campaigns_status`

### `public.email_recipients`

- **Primary key:** `email_recipients_pkey`
- **Indexes:** `idx_email_recipients_campaign`, `idx_email_recipients_email`,
  `idx_email_recipients_status`

### `public.email_templates`

- **Primary key:** `email_templates_pkey`

### `public.enrollment_audit_log`

- **Primary key:** `enrollment_audit_log_pkey`
- **Indexes:** `idx_enrollment_audit_student_id`

### `public.kv_config`

- **Primary key:** `kv_config_pkey`

### `public.media_files`

- **Primary key:** `media_files_pkey`
- **Indexes:** `idx_media_files_created_at`, `idx_media_files_telegram_file`,
  `idx_media_files_telegram_file_id`, `idx_media_files_uploaded_by`

### `public.market_news`

- **Primary key:** `market_news_pkey`
- **Indexes:** `market_news_event_time_idx`, `market_news_source_event_time_idx`

### `public.payment_intents`

- **Primary key:** `payment_intents_pkey`

### `public.payments`

- **Primary key:** `payments_pkey`
- **Indexes:** `idx_payment_analytics`, `idx_payments_created_at`,
  `idx_payments_plan_id`, `idx_payments_status`, `idx_payments_status_created`,
  `idx_payments_user_id`, `idx_payments_user_plan`, `idx_payments_user_status`,
  `idx_payments_user_status_date`

### `public.plan_channels`

- **Primary key:** `plan_channels_pkey`
- **Indexes:** `idx_plan_channels_plan_id_active`

### `public.profiles`

- **Primary key:** `profiles_pkey`
- **Unique constraints:** `profiles_telegram_id_key`, `profiles_ton_domain_key`
- **Indexes:** `idx_profiles_role`, `idx_profiles_telegram_id`

### `public.promo_analytics`

- **Primary key:** `promo_analytics_pkey`
- **Indexes:** `idx_promo_analytics_created_at`,
  `idx_promo_analytics_promo_code`

### `public.promotion_usage`

- **Primary key:** `promotion_usage_pkey`
- **Unique constraints:** `promotion_usage_promotion_id_telegram_user_id_key`
- **Indexes:** `idx_promotion_usage_promotion_id`

### `public.promotions`

- **Primary key:** `promotions_pkey`
- **Unique constraints:** `promotions_code_key`
- **Indexes:** `idx_promotions_active`, `idx_promotions_active_code`

### `public.session_audit_log`

- **Primary key:** `session_audit_log_pkey`
- **Indexes:** `idx_session_audit_telegram_user`

### `public.sentiment`

- **Primary key:** `sentiment_pkey`
- **Unique constraints:** `sentiment_source_symbol_key`
- **Indexes:** `sentiment_created_at_idx`

### `public.subdomain_claims`

- **Primary key:** `subdomain_claims_pkey`
- **Indexes:** `idx_subdomain_claims_status`, `idx_subdomain_claims_user_id`

### `public.subscription_audit_log`

- **Primary key:** `subscription_audit_log_pkey`

### `public.subscription_plans`

- **Primary key:** `subscription_plans_pkey`
- **Indexes:** `idx_subscription_plans_active`

### `public.ton_subdomains`

- **Primary key:** `ton_subdomains_pkey`
- **Unique constraints:** `ton_subdomains_full_domain_key`
- **Indexes:** `idx_ton_subdomains_subdomain`, `idx_ton_subdomains_user_id`,
  `idx_ton_subdomains_verified`

### `public.ton_transactions`

- **Primary key:** `ton_transactions_pkey`
- **Unique constraints:** `ton_transactions_transaction_hash_key`
- **Indexes:** `idx_ton_tx_created`, `idx_ton_tx_hash`, `idx_ton_tx_status`,
  `idx_ton_tx_user`

### `public.user_analytics`

- **Primary key:** `user_analytics_pkey`
- **Indexes:** `idx_user_analytics_created_at`, `idx_user_analytics_event_type`,
  `idx_user_analytics_session_id`, `idx_user_analytics_telegram_user_id`

### `public.user_interactions`

- **Primary key:** `user_interactions_pkey`
- **Indexes:** `idx_user_interactions_created_at`, `idx_user_interactions_date`,
  `idx_user_interactions_telegram_created`,
  `idx_user_interactions_telegram_user_id`, `idx_user_interactions_type`,
  `idx_user_interactions_type_created`, `idx_user_interactions_user_id`,
  `idx_user_interactions_user_type_date`

### `public.user_package_assignments`

- **Primary key:** `user_package_assignments_pkey`
- **Indexes:** `idx_assignments_active`, `idx_assignments_package_id`,
  `idx_assignments_user_id`, `idx_user_package_assignments_assigned_by`

### `public.user_sessions`

- **Primary key:** `user_sessions_pkey`
- **Indexes:** `idx_user_sessions_active`, `idx_user_sessions_last_activity`,
  `idx_user_sessions_telegram_active`, `idx_user_sessions_telegram_user_id`

### `public.user_subscriptions`

- **Primary key:** `user_subscriptions_pkey`
- **Unique constraints:** `user_subscriptions_telegram_user_id_key`
- **Indexes:** `idx_user_subscriptions_active`,
  `idx_user_subscriptions_active_lookup`, `idx_user_subscriptions_plan_active`,
  `idx_user_subscriptions_plan_id`, `idx_user_subscriptions_status_date`,
  `idx_user_subscriptions_telegram_active`,
  `idx_user_subscriptions_telegram_user_id`,
  `idx_user_subscriptions_user_status`

### `public.user_surveys`

- **Primary key:** `user_surveys_pkey`
- **Indexes:** `idx_user_surveys_completed_at`,
  `idx_user_surveys_telegram_user_id`
