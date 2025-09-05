-- Insert default bot content for auto intro and contact functionality
INSERT INTO public.bot_content (content_key, content_value, content_type, description, is_active, created_by, last_modified_by) VALUES
(
  'auto_intro_new',
  '🎉 Welcome to Dynamic Capital VIP Bot!

We''re excited to have you join our premium trading community!

🚀 What you can do:
• View our VIP packages with /packages
• Check active promotions with /promo  
• Get help with /help or /faq
• Contact support with /contact

Let''s get you started on your trading journey! 💎',
  'text',
  'Auto-intro message for new users visiting the bot for the first time',
  true,
  'system',
  'system'
),
(
  'auto_intro_returning',
  '👋 Welcome back to Dynamic Capital VIP Bot!

Great to see you again! Here''s what you can do:

📊 Check your account: /account
💎 Browse packages: /packages  
🎁 View promotions: /promo
❓ Get help: /help or /faq
💬 Contact us: /contact

Ready to continue your trading success? 🚀',
  'text',
  'Auto-intro message for returning users',
  true,
  'system',
  'system'
),
(
  'contact_message',
  '💬 Contact Dynamic Capital Support

📧 Email: support@dynamiccapital.com
💬 Telegram: @DynamicCapital_Support

🕐 Support Hours: 24/7
📞 We typically respond within 2-4 hours

How can we help you today?',
  'text',
  'Contact information message for /contact command',
  true,
  'system',
  'system'
)
ON CONFLICT (content_key) DO UPDATE SET
  content_value = EXCLUDED.content_value,
  description = EXCLUDED.description,
  updated_at = now(),
  last_modified_by = 'system';

-- Insert default contact links
INSERT INTO public.contact_links (platform, display_name, url, icon_emoji, is_active, display_order) VALUES
('email', 'Email', 'support@dynamiccapital.com', '📧', true, 1),
('telegram', 'Telegram Support', '@DynamicCapital_Support', '💬', true, 2),
('website', 'Website', 'https://dynamiccapital.com', '🌐', true, 3)
ON CONFLICT (platform, display_name) DO UPDATE SET
  url = EXCLUDED.url,
  icon_emoji = EXCLUDED.icon_emoji,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- Insert default bot setting for auto intro feature
INSERT INTO public.bot_settings (setting_key, setting_value, setting_type, description, is_active) VALUES
('auto_intro_enabled', 'true', 'boolean', 'Enable automatic intro messages for new and returning users', true)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();