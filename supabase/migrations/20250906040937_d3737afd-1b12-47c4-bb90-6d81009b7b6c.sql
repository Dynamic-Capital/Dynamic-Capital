-- Fix RLS infinite recursion on profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Create security definer function to get current user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Recreate admin policies using the security definer function
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

-- Add performance indexes for frequently queried tables
-- Bot users - telegram_id is heavily queried
CREATE INDEX IF NOT EXISTS idx_bot_users_telegram_id ON public.bot_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_bot_users_vip_admin ON public.bot_users(is_vip, is_admin) WHERE is_vip = true OR is_admin = true;

-- User sessions - active sessions and telegram lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_telegram_active ON public.user_sessions(telegram_user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity) WHERE is_active = true;

-- User interactions - analytics and recent activity
CREATE INDEX IF NOT EXISTS idx_user_interactions_telegram_created ON public.user_interactions(telegram_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON public.user_interactions(created_at);

-- Payments - status lookups and user payments
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON public.payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON public.payments(status, created_at);

-- User subscriptions - active subscriptions and telegram lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_telegram_active ON public.user_subscriptions(telegram_user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_active ON public.user_subscriptions(plan_id, is_active) WHERE is_active = true;

-- Education enrollments - student lookups and status
CREATE INDEX IF NOT EXISTS idx_education_enrollments_telegram_status ON public.education_enrollments(student_telegram_id, enrollment_status);
CREATE INDEX IF NOT EXISTS idx_education_enrollments_package_status ON public.education_enrollments(package_id, enrollment_status);

-- Bot settings and content - active content lookups
CREATE INDEX IF NOT EXISTS idx_bot_settings_key_active ON public.bot_settings(setting_key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bot_content_key_active ON public.bot_content(content_key) WHERE is_active = true;
