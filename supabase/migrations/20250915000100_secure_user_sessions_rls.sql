-- Harden RLS policies for user_sessions to protect sensitive data
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users insert own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users update own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users manage their sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users manage own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins manage all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role full access user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Deny anonymous access to user_sessions" ON public.user_sessions;

-- Explicitly block anonymous access
CREATE POLICY "Deny anonymous access to user_sessions"
ON public.user_sessions
FOR ALL
TO anon
USING (false);

-- Authenticated users may only manage their own sessions
CREATE POLICY "Users manage own sessions"
ON public.user_sessions
FOR ALL
TO authenticated
USING (auth.uid() = bot_user_id)
WITH CHECK (auth.uid() = bot_user_id);

-- Admins can manage all sessions
CREATE POLICY "Admins manage all sessions"
ON public.user_sessions
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Service role has full access
CREATE POLICY "Service role full access user_sessions"
ON public.user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
