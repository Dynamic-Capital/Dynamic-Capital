-- Enforce strict RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can view own sessions only" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can create own sessions only" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions only" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can manage their sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can manage all user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can manage user sessions" ON public.user_sessions;

-- Regular users: access limited to their own rows
CREATE POLICY "Users view own sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = bot_user_id);

CREATE POLICY "Users insert own sessions"
ON public.user_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = bot_user_id);

CREATE POLICY "Users update own sessions"
ON public.user_sessions
FOR UPDATE
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
