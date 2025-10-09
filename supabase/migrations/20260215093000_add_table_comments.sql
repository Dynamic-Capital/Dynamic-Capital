-- Add descriptive comments for key application tables
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT table_name, comment_text
        FROM (VALUES
            ('abuse_bans', 'Moderation ledger storing Telegram users who are temporarily or permanently blocked from the Dynamic Capital bot.'),
            ('admin_logs', 'Immutable audit trail of privileged administrative actions taken through the platform.'),
            ('auto_reply_templates', 'Preconfigured response templates that drive automated replies based on trigger conditions.'),
            ('bank_accounts', 'Bank payout accounts and wiring instructions presented to customers for fiat settlements.'),
            ('bot_content', 'Central repository for Dynamic Capital bot copy, scripts, and knowledge snippets.'),
            ('bot_sessions', 'Runtime telemetry for each bot session, including activity counts and lifecycle timestamps.'),
            ('bot_settings', 'Feature toggles and configuration values that control bot behaviour at runtime.'),
            ('bot_users', 'Telegram user registry containing identity, subscription, and follow-up metadata.'),
            ('broadcast_messages', 'Queued announcements and bulk messages distributed to Dynamic Capital broadcast audiences.'),
            ('channel_memberships', 'Links users to gated broadcast or discussion channels tied to their subscription plan.'),
            ('chat_messages', 'Message history for interactive chat sessions between users and Dynamic Capital assistants.'),
            ('chat_sessions', 'Conversation session records that group chat messages and capture context metadata.'),
            ('contact_links', 'Curated contact and call-to-action links surfaced inside the Telegram bot experience.'),
            ('conversion_tracking', 'Attribution dataset logging promo clicks and conversions for marketing funnels.'),
            ('daily_analytics', 'Daily aggregated analytics covering growth, retention, and engagement KPIs.'),
            ('domain_resolution_cache', 'Cached DNS and resolver lookups to accelerate repeated domain availability checks.'),
            ('education_categories', 'Top-level categories used to organise education packages in the academy.'),
            ('education_enrollments', 'Enrollment records mapping learners to Dynamic Capital education packages and progress.'),
            ('education_packages', 'Catalog of structured education products, modules, and bundled lessons.'),
            ('email_campaigns', 'Outbound email campaign definitions, scheduling metadata, and creative settings.'),
            ('email_recipients', 'Recipient targeting lists and delivery state for each email campaign send.'),
            ('email_templates', 'Reusable HTML and text templates that power branded outbound email.'),
            ('enrollment_audit_log', 'Change history capturing who altered education enrollments and when.'),
            ('kv_config', 'General-purpose key/value configuration store consumed across services.'),
            ('media_files', 'Metadata for media assets uploaded to storage and referenced by the platform.'),
            ('payment_intents', 'Initiated payment attempts with provider references and expected settlement state.'),
            ('payments', 'Payment processing table - Stripe integration removed, supports crypto, Binance Pay, bank transfers, and manual payments only.'),
            ('plan_channels', 'Mapping between subscription plans and the Telegram channels or chats they unlock.'),
            ('profiles', 'Extended profile information for authenticated users beyond Telegram basics.'),
            ('promo_analytics', 'Roll-up analytics tracking the performance of promotions and referral funnels.'),
            ('promotion_usage', 'Usage ledger counting how often each promotion code has been redeemed.'),
            ('promotions', 'Definition of promotional codes, discounts, and availability windows.'),
            ('session_audit_log', 'Audit trail for authentication sessions to support security investigations.'),
            ('subdomain_claims', 'User-submitted claims for Dynamic Capital branded subdomains awaiting approval.'),
            ('subscription_audit_log', 'Audit log recording lifecycle changes to user subscriptions and billing events.'),
            ('subscription_plans', 'Catalog of available subscription plans, pricing, and entitlement metadata.'),
            ('ton_subdomains', 'Registry of TON subdomains minted or reserved through Dynamic Capital infrastructure.'),
            ('ton_transactions', 'On-chain transaction records sourced from the TON payment rails and wallets.'),
            ('user_analytics', 'Aggregated analytics features capturing user-level engagement signals.'),
            ('user_interactions', 'Event stream of user interactions with the Telegram bot and its features.'),
            ('user_package_assignments', 'Assignments linking users to premium package entitlements and delivery status.'),
            ('user_sessions', 'Session metadata for authenticated app usage, including device and timing details.'),
            ('user_subscriptions', 'Active and historical subscription records with plan, status, and renewal data.'),
            ('user_surveys', 'Survey responses collected from users for feedback and research initiatives.')
        ) AS comment_data(table_name, comment_text)
    LOOP
        EXECUTE format('comment on table public.%I is %L', rec.table_name, rec.comment_text);
    END LOOP;
END;
$$;
