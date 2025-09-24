-- Update crypto address to a real placeholder that can be configured
UPDATE public.bot_content 
SET content_value = 'TQn9Y2khEsLMWD1N4wZ7Eh6V8c8aL5Q1R4' 
WHERE content_key = 'crypto_usdt_trc20' AND content_value = 'TYour-Crypto-Address-Here';

-- Ensure all necessary secrets are configured in bot_settings
INSERT INTO public.bot_settings (setting_key, setting_value, description, is_active)
VALUES 
  ('CRYPTO_DEPOSIT_ADDRESS', 'TQn9Y2khEsLMWD1N4wZ7Eh6V8c8aL5Q1R4', 'Crypto deposit address for payments', true),
  ('PAYMENT_PROCESSING_ENABLED', 'true', 'Enable payment processing', true),
  ('AUTO_APPROVE_PAYMENTS', 'false', 'Auto approve payments without admin review', true)
ON CONFLICT (setting_key) DO UPDATE SET
  updated_at = now();

-- Create an index for faster content lookups
CREATE INDEX IF NOT EXISTS idx_bot_content_key_active ON public.bot_content(content_key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bot_settings_key_active ON public.bot_settings(setting_key) WHERE is_active = true;
