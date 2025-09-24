-- CRITICAL SECURITY FIX: Lock down all tables with proper RLS policies
-- This migration secures all tables that currently have inadequate or missing RLS policies

-- 1. Fix bot_users table - currently has service role access only, but needs proper user policies
DROP POLICY IF EXISTS "Service role can manage bot users" ON public.bot_users;

CREATE POLICY "Service role can manage bot users" 
ON public.bot_users 
FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Users can view their own bot user record" 
ON public.bot_users 
FOR SELECT 
TO authenticated
USING (auth.jwt() ->> 'sub' IN (
  SELECT id::text FROM public.profiles WHERE telegram_id = bot_users.telegram_id
));

CREATE POLICY "Admins can view all bot users" 
ON public.bot_users 
FOR SELECT 
TO authenticated
USING (public.is_user_admin(auth.jwt() ->> 'telegram_user_id'));

-- 2. Fix payments table - currently has service role only, add user/admin policies
DROP POLICY IF EXISTS "Service role can manage payments" ON public.payments;

CREATE POLICY "Service role can manage payments" 
ON public.payments 
FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (public.is_user_admin(auth.jwt() ->> 'telegram_user_id'));

-- 3. Fix bot_sessions table - currently service role only, add proper restrictions
DROP POLICY IF EXISTS "Service role can manage bot sessions" ON public.bot_sessions;

CREATE POLICY "Service role can manage bot sessions" 
ON public.bot_sessions 
FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Users can view their own sessions" 
ON public.bot_sessions 
FOR SELECT 
TO authenticated
USING (auth.jwt() ->> 'sub' IN (
  SELECT id::text FROM public.profiles WHERE telegram_id = bot_sessions.telegram_user_id
));

CREATE POLICY "Admins can view all sessions" 
ON public.bot_sessions 
FOR SELECT 
TO authenticated
USING (public.is_user_admin(auth.jwt() ->> 'telegram_user_id'));

-- 4. Fix admin_logs table - currently service role only, make admin-only
DROP POLICY IF EXISTS "Service role can manage admin logs" ON public.admin_logs;

CREATE POLICY "Service role can manage admin logs" 
ON public.admin_logs 
FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Admins can view admin logs" 
ON public.admin_logs 
FOR SELECT 
TO authenticated
USING (public.is_user_admin(auth.jwt() ->> 'telegram_user_id'));

-- 5. Fix user_interactions table - currently service role only, add user/admin policies
DROP POLICY IF EXISTS "Service role can manage user interactions" ON public.user_interactions;

CREATE POLICY "Service role can manage user interactions" 
ON public.user_interactions 
FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Users can view their own interactions" 
ON public.user_interactions 
FOR SELECT 
TO authenticated
USING (auth.jwt() ->> 'sub' IN (
  SELECT id::text FROM public.profiles WHERE telegram_id = user_interactions.telegram_user_id
));

CREATE POLICY "Admins can view all interactions" 
ON public.user_interactions 
FOR SELECT 
TO authenticated
USING (public.is_user_admin(auth.jwt() ->> 'telegram_user_id'));

-- 6. Fix media_files table - currently service role only, add proper user restrictions
DROP POLICY IF EXISTS "Service role can manage media files" ON public.media_files;

CREATE POLICY "Service role can manage media files" 
ON public.media_files 
FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Users can view their own media files" 
ON public.media_files 
FOR SELECT 
TO authenticated
USING (uploaded_by = auth.jwt() ->> 'telegram_user_id');

CREATE POLICY "Admins can view all media files" 
ON public.media_files 
FOR SELECT 
TO authenticated
USING (public.is_user_admin(auth.jwt() ->> 'telegram_user_id'));

-- 7. Add missing helper function for secure telegram user validation
CREATE OR REPLACE FUNCTION public.get_current_user_telegram_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT telegram_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 8. Update education_enrollments policies to be more secure
-- The existing policies look good but let's ensure they're bulletproof
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.education_enrollments;
DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.education_enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.education_enrollments;

CREATE POLICY "Users can view their own enrollments" 
ON public.education_enrollments 
FOR SELECT 
TO authenticated
USING (student_telegram_id = public.get_current_user_telegram_id());

CREATE POLICY "Users can create their own enrollments" 
ON public.education_enrollments 
FOR INSERT 
TO authenticated
WITH CHECK (student_telegram_id = public.get_current_user_telegram_id());

CREATE POLICY "Users can update their own enrollments" 
ON public.education_enrollments 
FOR UPDATE 
TO authenticated
USING (student_telegram_id = public.get_current_user_telegram_id());

-- 9. Ensure all sensitive tables have anon role explicitly denied
-- This creates an explicit deny for anonymous users on all sensitive tables
CREATE POLICY "Deny anonymous access to bot_users" 
ON public.bot_users 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to payments" 
ON public.payments 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to bot_sessions" 
ON public.bot_sessions 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to admin_logs" 
ON public.admin_logs 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_interactions" 
ON public.user_interactions 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to media_files" 
ON public.media_files 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to education_enrollments" 
ON public.education_enrollments 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_sessions" 
ON public.user_sessions 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_subscriptions" 
ON public.user_subscriptions 
FOR ALL 
TO anon
USING (false);
