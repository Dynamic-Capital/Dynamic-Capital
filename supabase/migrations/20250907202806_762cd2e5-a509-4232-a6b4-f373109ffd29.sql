-- Fix critical security vulnerability: User session data access controls
-- Update RLS policies to properly restrict session access

-- Drop existing problematic policies that may have incorrect logic
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.user_sessions;

-- Create secure policy for users to view only their own sessions
CREATE POLICY "Users can view own sessions only" 
ON public.user_sessions 
FOR SELECT 
TO authenticated
USING (
  -- Match telegram_user_id with the user's telegram_id from profiles
  telegram_user_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Create policy for users to create their own sessions
CREATE POLICY "Users can create own sessions only" 
ON public.user_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (
  telegram_user_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Create policy for users to update only their own sessions
CREATE POLICY "Users can update own sessions only" 
ON public.user_sessions 
FOR UPDATE 
TO authenticated
USING (
  telegram_user_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  telegram_user_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Create policy for admins to manage all sessions
CREATE POLICY "Admins can manage all user sessions" 
ON public.user_sessions 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create a security function to mask sensitive session data
CREATE OR REPLACE FUNCTION public.get_masked_session_info(session_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT CASE 
    -- Admins get full access to all session details
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      jsonb_build_object(
        'id', s.id,
        'telegram_user_id', s.telegram_user_id,
        'is_active', s.is_active,
        'awaiting_input', s.awaiting_input,
        'last_activity', s.last_activity,
        'session_data', s.session_data,
        'promo_data', s.promo_data,
        'package_data', s.package_data,
        'created_at', s.created_at,
        'ended_at', s.ended_at,
        'end_reason', s.end_reason
      )
    -- Regular users get limited session info (their own sessions only)
    WHEN s.telegram_user_id = (
      SELECT telegram_id FROM public.profiles WHERE id = auth.uid()
    ) THEN
      jsonb_build_object(
        'id', s.id,
        'is_active', s.is_active,
        'last_activity', s.last_activity,
        'awaiting_input', s.awaiting_input,
        'created_at', s.created_at,
        'session_summary', CASE 
          WHEN s.session_data IS NOT NULL 
          THEN 'Session data available'
          ELSE 'No session data'
        END
      )
    ELSE
      jsonb_build_object('error', 'Access denied')
  END
  FROM public.user_sessions s
  WHERE s.id = session_id;
$function$;

-- Create session audit logging for security monitoring
CREATE TABLE IF NOT EXISTS public.session_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.user_sessions(id),
  telegram_user_id text NOT NULL,
  action_type text NOT NULL, -- 'created', 'accessed', 'updated', 'ended'
  ip_address inet,
  user_agent text,
  access_details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on session audit log
ALTER TABLE public.session_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view session audit logs
CREATE POLICY "Only admins can view session audit logs" 
ON public.session_audit_log 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Users can view their own session audit logs
CREATE POLICY "Users can view own session audit logs" 
ON public.session_audit_log 
FOR SELECT 
TO authenticated
USING (
  telegram_user_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Service role can manage audit logs
CREATE POLICY "Service role can manage session audit logs" 
ON public.session_audit_log 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add function to automatically clean up old sessions for security
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions(cleanup_hours integer DEFAULT 72)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  cleanup_time TIMESTAMPTZ;
  cleaned_count INTEGER := 0;
BEGIN
  cleanup_time := NOW() - (cleanup_hours || ' hours')::INTERVAL;
  
  -- End and clean up inactive sessions older than specified hours
  WITH updated_sessions AS (
    UPDATE public.user_sessions 
    SET 
      is_active = false,
      ended_at = NOW(),
      end_reason = 'auto_cleanup_old_session'
    WHERE 
      is_active = true 
      AND last_activity < cleanup_time
    RETURNING id
  )
  SELECT COUNT(*) INTO cleaned_count FROM updated_sessions;
  
  -- Log the cleanup operation
  INSERT INTO public.session_audit_log (
    session_id, 
    telegram_user_id, 
    action_type, 
    access_details
  )
  SELECT 
    NULL,
    'system',
    'cleanup',
    jsonb_build_object(
      'cleaned_sessions', cleaned_count,
      'cleanup_time', cleanup_time,
      'cleanup_hours', cleanup_hours
    );
  
  RETURN jsonb_build_object(
    'cleaned_sessions', cleaned_count,
    'cleanup_time', cleanup_time,
    'cleanup_hours', cleanup_hours
  );
END;
$function$;

-- Add index for better performance on session queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_telegram_user_id ON public.user_sessions(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active, last_activity);
CREATE INDEX IF NOT EXISTS idx_session_audit_telegram_user ON public.session_audit_log(telegram_user_id, created_at);
