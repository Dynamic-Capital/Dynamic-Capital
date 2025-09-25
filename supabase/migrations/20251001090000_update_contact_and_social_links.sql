-- Update social contact links to latest platforms
UPDATE public.bot_settings
SET setting_value = 'https://www.instagram.com/dynamic.capital/'
WHERE setting_key = 'social_instagram_url';

UPDATE public.bot_settings
SET setting_value = 'https://www.facebook.com/dynamic.capital.fb/'
WHERE setting_key = 'social_facebook_url';

UPDATE public.bot_settings
SET setting_value = 'https://www.tiktok.com/@dynamic.capital.mv/'
WHERE setting_key = 'social_tiktok_url';

UPDATE public.bot_settings
SET setting_value = 'https://www.tradingview.com/u/DynamicCapital-FX/'
WHERE setting_key = 'social_tradingview_url';

-- Sync the contact_links table so /contact shares the latest destinations
UPDATE public.contact_links
SET
  display_name = 'Instagram',
  url = 'https://www.instagram.com/dynamic.capital/',
  icon_emoji = '📱'
WHERE platform ILIKE '%instagram%' AND is_active = true;

UPDATE public.contact_links
SET
  display_name = 'Facebook',
  url = 'https://www.facebook.com/dynamic.capital.fb/',
  icon_emoji = '📱'
WHERE platform ILIKE '%facebook%' AND is_active = true;

UPDATE public.contact_links
SET
  display_name = 'TikTok',
  url = 'https://www.tiktok.com/@dynamic.capital.mv/',
  icon_emoji = '📱'
WHERE platform ILIKE '%tiktok%' AND is_active = true;

UPDATE public.contact_links
SET
  display_name = 'TradingView',
  url = 'https://www.tradingview.com/u/DynamicCapital-FX/',
  icon_emoji = '📊'
WHERE platform ILIKE '%tradingview%' AND is_active = true;

-- Refresh the default contact message so the bot mirrors the new links
UPDATE public.bot_content
SET content_value = '💬 Contact Dynamic Capital Support

📱 Instagram: https://www.instagram.com/dynamic.capital/
📱 Facebook: https://www.facebook.com/dynamic.capital.fb/
📊 TradingView: https://www.tradingview.com/u/DynamicCapital-FX/
📱 TikTok: https://www.tiktok.com/@dynamic.capital.mv/

🕐 Support Hours: 24/7
📞 We typically respond within 2-4 hours

How can we help you today?'
WHERE content_key = 'contact_message';
