-- Restrict payments visibility to owning user
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Remove existing conflicting policies
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert their payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their payments" ON public.payments;
DROP POLICY IF EXISTS "Service role only for payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Service role can manage payments" ON public.payments;

-- User policies
CREATE POLICY "Users view own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins manage all payments"
ON public.payments
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Service role full access
CREATE POLICY "Service role full access payments"
ON public.payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
