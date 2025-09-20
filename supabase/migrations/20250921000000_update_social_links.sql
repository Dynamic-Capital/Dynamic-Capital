-- Update social media URLs for Instagram, Facebook, and TradingView
UPDATE public.bot_settings
SET setting_value = 'https://www.instagram.com/dynamic.capital/'
WHERE setting_key = 'social_instagram_url';

UPDATE public.bot_settings
SET setting_value = 'https://web.facebook.com/dynamic.capital.fb/'
WHERE setting_key = 'social_facebook_url';

UPDATE public.bot_settings
SET setting_value = 'https://www.tradingview.com/u/DynamicCapital-FX/'
WHERE setting_key = 'social_tradingview_url';

UPDATE public.contact_links
SET url = 'https://www.instagram.com/dynamic.capital/'
WHERE platform ILIKE '%instagram%' AND is_active = true;

UPDATE public.contact_links
SET url = 'https://web.facebook.com/dynamic.capital.fb/'
WHERE platform ILIKE '%facebook%' AND is_active = true;

UPDATE public.contact_links
SET url = 'https://www.tradingview.com/u/DynamicCapital-FX/'
WHERE platform ILIKE '%tradingview%' AND is_active = true;
