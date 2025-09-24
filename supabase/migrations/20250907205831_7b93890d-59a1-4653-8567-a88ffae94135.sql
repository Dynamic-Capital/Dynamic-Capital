-- Add crypto configuration to bot_content table
INSERT INTO public.bot_content (content_key, content_value, description, is_active) 
VALUES 
  ('crypto_usdt_trc20', 'TYour-Crypto-Address-Here', 'USDT TRC20 wallet address for crypto payments', true),
  ('telegram_bot_url', 'https://t.me/Dynamic_VIP_BOT', 'Official Telegram bot URL', true),
  ('default_crypto_amount', '50', 'Default crypto payment amount in USD', true)
ON CONFLICT (content_key) DO UPDATE SET
  content_value = EXCLUDED.content_value,
  updated_at = now();

-- Add webhook secret to bot_settings if not exists
INSERT INTO public.bot_settings (setting_key, setting_value, description, is_active)
VALUES 
  ('TELEGRAM_WEBHOOK_SECRET', gen_random_uuid()::text, 'Telegram webhook verification secret', true),
  ('BOT_VERSION', '2.1.0', 'Current bot version', true),
  ('MAINTENANCE_MODE', 'false', 'Bot maintenance mode flag', true)
ON CONFLICT (setting_key) DO NOTHING;
