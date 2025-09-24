-- Fix promo codes: activate and extend validity dates
UPDATE public.promotions 
SET 
  is_active = true,
  valid_until = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE code IN ('SAVE20', 'WELCOME10', 'LIFETIME50', 'FLASH30');

-- Update the expired VIPBOTLAUNCH50 code
UPDATE public.promotions 
SET 
  valid_until = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE code = 'VIPBOTLAUNCH50';

-- Create a new active promo code for testing
INSERT INTO public.promotions (code, description, discount_type, discount_value, is_active, valid_from, valid_until, max_uses)
VALUES 
  ('TEST10', '10% off for testing', 'percentage', 10, true, NOW(), NOW() + INTERVAL '30 days', 100)
ON CONFLICT (code) DO UPDATE SET
  is_active = true,
  valid_until = NOW() + INTERVAL '30 days',
  updated_at = NOW();
