-- Insert sample contact links for testing
INSERT INTO public.contact_links (platform, display_name, url, icon_emoji, display_order, is_active) VALUES
  ('Telegram', 'Customer Support', 'https://t.me/Dynamic_VIP_Support', '💬', 1, true),
  ('Telegram', 'VIP Channel', 'https://t.me/Dynamic_VIP_Channel', '⭐', 2, true),
  ('WhatsApp', 'WhatsApp Support', 'https://wa.me/1234567890', '📱', 3, true),
  ('Email', 'Support Email', 'mailto:support@dynamiccapital.ton', '📧', 4, true),
  ('Website', 'Official Website', 'https://dynamiccapital.com', '🌐', 5, true)
ON CONFLICT DO NOTHING;
