-- Insert VIP channel links into plan_channels table for all plans
INSERT INTO public.plan_channels (plan_id, channel_name, channel_type, invite_link, chat_id, is_active)
SELECT 
  sp.id as plan_id,
  'VIP Channel' as channel_name,
  'channel' as channel_type,
  'https://t.me/+_k_CP8gR20E2YTll' as invite_link,
  null as chat_id,
  true as is_active
FROM public.subscription_plans sp
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_channels (plan_id, channel_name, channel_type, invite_link, chat_id, is_active)
SELECT 
  sp.id as plan_id,
  'VIP Group' as channel_name,
  'group' as channel_type,
  'https://t.me/+-eTumm8BD88wMzY1' as invite_link,
  null as chat_id,
  true as is_active
FROM public.subscription_plans sp
ON CONFLICT DO NOTHING;

-- Add VIP invite links as bot settings fallback
INSERT INTO public.bot_settings (setting_key, setting_value, setting_type, description, is_active)
VALUES 
  ('vip_channel_link', 'https://t.me/+_k_CP8gR20E2YTll', 'string', 'Default VIP channel invite link', true),
  ('vip_group_link', 'https://t.me/+-eTumm8BD88wMzY1', 'string', 'Default VIP group invite link', true)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();
