-- Create edge function to get admin status and subscription details
-- This function will be called via Supabase edge functions

-- First, let's ensure we have proper admin detection via telegram_id
-- Check if telegram user is admin
CREATE OR REPLACE FUNCTION public.is_telegram_admin(telegram_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE((
    SELECT is_admin 
    FROM public.bot_users 
    WHERE telegram_id = telegram_user_id
  ), false);
$function$;

-- Function to get user subscription status with detailed info
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(telegram_user_id text)
RETURNS TABLE(
  is_vip boolean,
  plan_name text,
  subscription_end_date timestamptz,
  days_remaining integer,
  payment_status text,
  is_expired boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT 
    COALESCE(bu.is_vip, false) as is_vip,
    sp.name as plan_name,
    us.subscription_end_date,
    CASE 
      WHEN us.subscription_end_date IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(days FROM us.subscription_end_date - NOW())::integer)
    END as days_remaining,
    us.payment_status,
    CASE 
      WHEN us.subscription_end_date IS NULL THEN false
      ELSE us.subscription_end_date < NOW()
    END as is_expired
  FROM public.bot_users bu
  LEFT JOIN public.user_subscriptions us ON bu.telegram_id = us.telegram_user_id AND us.is_active = true
  LEFT JOIN public.subscription_plans sp ON us.plan_id = sp.id
  WHERE bu.telegram_id = $1
  ORDER BY us.created_at DESC
  LIMIT 1;
$function$;