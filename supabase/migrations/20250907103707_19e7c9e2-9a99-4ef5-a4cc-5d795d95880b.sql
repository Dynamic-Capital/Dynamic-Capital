-- Insert sample bot content for the mini app
INSERT INTO public.bot_content (content_key, content_value, description, created_by) VALUES
('about_us', 'Dynamic Capital is your premier destination for professional trading insights and VIP market analysis. We provide cutting-edge trading signals, comprehensive market research, and personalized support to help you achieve your financial goals.

🏆 Founded by experienced traders with over 10 years in the market
📊 Proven track record with 85%+ success rate
🌍 Serving 5000+ active members globally
💎 Cutting-edge technology and real-time analysis', 'About Dynamic Capital section for mini app', 'system'),

('our_services', '📈 Real-time Trading Signals
📊 Daily Market Analysis & Reports
🛡️ Risk Management Guidance
👨‍🏫 Personal Trading Mentor
💎 Exclusive VIP Community Access
📞 24/7 Premium Customer Support
📱 Mobile App & Telegram Integration
🎯 Personalized Trading Strategies', 'Services offered by Dynamic Capital', 'system'),

('announcements', '🚀 NEW YEAR SPECIAL OFFER! 
Get 30% OFF on all VIP subscriptions for the first 100 members!

📈 Market Update: We''ve achieved 92% success rate this month with our premium signals!

🎯 New Feature: Real-time market alerts now available in our mobile app.

⭐ Join 5000+ successful traders who trust Dynamic Capital for their trading journey.', 'Latest announcements and updates', 'system')

ON CONFLICT (content_key) DO UPDATE SET
content_value = EXCLUDED.content_value,
updated_at = now();

-- Insert sample active promotions
INSERT INTO public.promotions (code, description, discount_type, discount_value, valid_from, valid_until, max_uses, is_active) VALUES
('NEWYEAR30', 'New Year Special - 30% off all VIP plans', 'percentage', 30, NOW(), NOW() + INTERVAL '30 days', 100, true),
('FIRST50', 'First 50 members get $50 off', 'fixed', 50, NOW(), NOW() + INTERVAL '15 days', 50, true),
('VIP2024', '2024 VIP Launch Offer - 25% discount', 'percentage', 25, NOW(), NOW() + INTERVAL '45 days', 200, true)

ON CONFLICT (code) DO UPDATE SET
description = EXCLUDED.description,
discount_value = EXCLUDED.discount_value,
valid_until = EXCLUDED.valid_until,
updated_at = now();