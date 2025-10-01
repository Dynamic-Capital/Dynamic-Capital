-- Align contact messaging with dynamiccapital.ton email routing
DO $$
DECLARE
  support_message text := '🛟 *Need Help?*

Our support team is here for you!

📧 Support: support@dynamiccapital.ton
💬 Telegram: @DynamicCapital_Support
📣 Marketing: marketing@dynamiccapital.ton
🕐 Support Hours: 24/7

We typically respond within 2-4 hours.';
  contact_message text := '💬 Contact Dynamic Capital Support

📧 Inquiries: hello@dynamiccapital.ton
🛟 Support: support@dynamiccapital.ton
📣 Marketing: marketing@dynamiccapital.ton
💬 Telegram: @DynamicCapital_Support

🕐 Support Hours: 24/7
📞 We typically respond within 2-4 hours

How can we help you today?';
BEGIN
  UPDATE public.bot_content
  SET content_value = support_message,
      updated_at = NOW(),
      last_modified_by = COALESCE(last_modified_by, 'system')
  WHERE content_key = 'support_message';

  UPDATE public.bot_content
  SET content_value = contact_message,
      updated_at = NOW(),
      last_modified_by = COALESCE(last_modified_by, 'system')
  WHERE content_key = 'contact_message';

  UPDATE public.contact_links
  SET platform = 'email',
      display_name = 'Inquiries Email',
      url = 'hello@dynamiccapital.ton',
      icon_emoji = '📧',
      display_order = 1,
      is_active = TRUE,
      updated_at = NOW()
  WHERE lower(platform) = 'email'
    AND lower(display_name) IN ('email', 'inquiries email');

  IF NOT EXISTS (
    SELECT 1 FROM public.contact_links
    WHERE lower(platform) = 'support' AND lower(display_name) = 'support email'
  ) THEN
    INSERT INTO public.contact_links (platform, display_name, url, icon_emoji, is_active, display_order)
    VALUES ('support', 'Support Email', 'support@dynamiccapital.ton', '🛟', TRUE, 2);
  ELSE
    UPDATE public.contact_links
    SET platform = 'support',
        url = 'support@dynamiccapital.ton',
        icon_emoji = '🛟',
        display_order = 2,
        is_active = TRUE,
        updated_at = NOW()
    WHERE lower(platform) = 'support' AND lower(display_name) = 'support email';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.contact_links
    WHERE lower(platform) = 'marketing' AND lower(display_name) = 'marketing email'
  ) THEN
    INSERT INTO public.contact_links (platform, display_name, url, icon_emoji, is_active, display_order)
    VALUES ('marketing', 'Marketing Email', 'marketing@dynamiccapital.ton', '📣', TRUE, 3);
  ELSE
    UPDATE public.contact_links
    SET platform = 'marketing',
        url = 'marketing@dynamiccapital.ton',
        icon_emoji = '📣',
        display_order = 3,
        is_active = TRUE,
        updated_at = NOW()
    WHERE lower(platform) = 'marketing' AND lower(display_name) = 'marketing email';
  END IF;

  UPDATE public.contact_links
  SET display_order = 4,
      icon_emoji = COALESCE(icon_emoji, '💬'),
      updated_at = NOW()
  WHERE lower(platform) = 'telegram';

  UPDATE public.contact_links
  SET display_order = 5,
      icon_emoji = COALESCE(icon_emoji, '🌐'),
      updated_at = NOW()
  WHERE lower(platform) = 'website';
END $$;
