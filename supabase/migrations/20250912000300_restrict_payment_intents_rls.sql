-- Restrict payment_intents visibility to owning user
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Remove existing policies
DROP POLICY IF EXISTS "Users can view their own payment intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Service role can manage payment intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Users view own payment_intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Users insert own payment_intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Users update own payment_intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Admins manage all payment_intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Service role full access payment_intents" ON public.payment_intents;

-- User policies
CREATE POLICY "Users view own payment_intents"
ON public.payment_intents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own payment_intents"
ON public.payment_intents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own payment_intents"
ON public.payment_intents
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins manage all payment_intents"
ON public.payment_intents
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Service role full access
CREATE POLICY "Service role full access payment_intents"
ON public.payment_intents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
