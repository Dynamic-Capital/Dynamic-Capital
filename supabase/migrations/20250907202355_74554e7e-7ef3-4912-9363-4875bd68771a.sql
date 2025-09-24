-- Fix critical security vulnerability: Bank account details exposed to public
-- Remove public access and restrict to admin users only

-- Drop the existing policy that allows anyone to view bank accounts
DROP POLICY IF EXISTS "Anyone can view active bank accounts" ON public.bank_accounts;

-- Create new secure policies for bank accounts
CREATE POLICY "Only admins can view bank accounts" 
ON public.bank_accounts 
FOR SELECT 
TO authenticated
USING (
  -- Only allow users with admin role to view bank accounts
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Update the management policy to be more specific about service role
DROP POLICY IF EXISTS "Bot can manage bank accounts" ON public.bank_accounts;

CREATE POLICY "Service role can manage bank accounts" 
ON public.bank_accounts 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for admin users to manage bank accounts
CREATE POLICY "Admins can manage bank accounts" 
ON public.bank_accounts 
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
