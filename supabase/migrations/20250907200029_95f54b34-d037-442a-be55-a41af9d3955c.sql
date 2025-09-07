-- Create enhanced user analytics tracking
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  referrer TEXT,
  page_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  session_id TEXT,
  ip_address INET,
  device_type TEXT,
  browser TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_telegram_user_id ON public.user_analytics(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON public.user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON public.user_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_user_analytics_session_id ON public.user_analytics(session_id);

-- Enable RLS
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can manage user analytics" ON public.user_analytics
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all analytics" ON public.user_analytics
  FOR SELECT TO authenticated
  USING (is_user_admin((auth.jwt() ->> 'telegram_user_id')));

-- Create enhanced bot settings for social media links
INSERT INTO public.bot_settings (setting_key, setting_value, setting_type, description, is_active)
VALUES 
  ('social_instagram_url', 'https://instagram.com/dynamiccapital', 'string', 'Instagram profile URL', true),
  ('social_facebook_url', 'https://facebook.com/dynamiccapital', 'string', 'Facebook page URL', true),
  ('social_tiktok_url', 'https://tiktok.com/@dynamiccapital', 'string', 'TikTok profile URL', true),
  ('social_tradingview_url', 'https://tradingview.com/u/DynamicCapital', 'string', 'TradingView profile URL', true),
  ('brand_primary_color', '#dc2626', 'string', 'Primary brand color (red)', true),
  ('brand_secondary_color', '#ea580c', 'string', 'Secondary brand color (orange-red)', true)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- Update existing contact links to use proper social media platforms
UPDATE public.contact_links 
SET 
  platform = 'Instagram',
  icon_emoji = '📸',
  url = 'https://instagram.com/dynamiccapital'
WHERE platform ILIKE '%instagram%' AND is_active = true;

UPDATE public.contact_links 
SET 
  platform = 'Facebook',
  icon_emoji = '📘',
  url = 'https://facebook.com/dynamiccapital'
WHERE platform ILIKE '%facebook%' AND is_active = true;

-- Insert new social media links if they don't exist
INSERT INTO public.contact_links (platform, display_name, url, icon_emoji, is_active, display_order)
VALUES 
  ('TikTok', 'TikTok', 'https://tiktok.com/@dynamiccapital', '🎵', true, 3),
  ('TradingView', 'TradingView', 'https://tradingview.com/u/DynamicCapital', '📊', true, 4)
ON CONFLICT DO NOTHING;

-- Create function to track user events
CREATE OR REPLACE FUNCTION public.track_user_event(
  p_telegram_user_id TEXT,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_session_id TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.user_analytics (
    telegram_user_id,
    event_type,
    event_data,
    session_id,
    user_agent,
    referrer,
    page_url
  ) VALUES (
    p_telegram_user_id,
    p_event_type,
    p_event_data,
    p_session_id,
    p_user_agent,
    p_referrer,
    p_page_url
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Create function to get user analytics summary
CREATE OR REPLACE FUNCTION public.get_user_analytics_summary(
  p_telegram_user_id TEXT,
  p_days INTEGER DEFAULT 7
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
  start_date TIMESTAMPTZ;
BEGIN
  start_date := NOW() - (p_days || ' days')::INTERVAL;
  
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'unique_sessions', COUNT(DISTINCT session_id),
    'event_breakdown', jsonb_object_agg(event_type, event_count),
    'last_activity', MAX(created_at),
    'date_range', jsonb_build_object(
      'from', start_date,
      'to', NOW(),
      'days', p_days
    )
  ) INTO result
  FROM (
    SELECT 
      event_type,
      COUNT(*) as event_count,
      session_id,
      created_at
    FROM public.user_analytics 
    WHERE telegram_user_id = p_telegram_user_id 
      AND created_at >= start_date
    GROUP BY event_type, session_id, created_at
  ) analytics_data;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;