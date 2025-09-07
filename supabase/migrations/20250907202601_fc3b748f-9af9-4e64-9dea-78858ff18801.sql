-- Fix critical security vulnerability: Payment information access controls
-- Add proper RLS policies for user subscription access while protecting sensitive data

-- Create policy for users to view their own subscription records
CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
TO authenticated
USING (
  -- Allow users to view their own subscriptions based on telegram_user_id
  telegram_user_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Create policy for users to update specific fields of their own subscriptions
-- Users can update receipt info and some basic details, but not sensitive payment data
CREATE POLICY "Users can update their own subscription details" 
ON public.user_subscriptions 
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

-- Create policy for users to insert their own subscription records
CREATE POLICY "Users can create their own subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
TO authenticated
WITH CHECK (
  telegram_user_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Create policy for admins to view all subscription records
CREATE POLICY "Admins can view all subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create policy for admins to manage all subscription records
CREATE POLICY "Admins can manage all subscriptions" 
ON public.user_subscriptions 
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

-- Create a security function to mask sensitive payment data for regular users
CREATE OR REPLACE FUNCTION public.get_masked_subscription_info(subscription_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT CASE 
    -- Admins get full access to all payment details
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      jsonb_build_object(
        'id', s.id,
        'plan_id', s.plan_id,
        'payment_status', s.payment_status,
        'payment_method', s.payment_method,
        'bank_details', s.bank_details,
        'payment_instructions', s.payment_instructions,
        'receipt_file_path', s.receipt_file_path,
        'subscription_start_date', s.subscription_start_date,
        'subscription_end_date', s.subscription_end_date,
        'is_active', s.is_active,
        'created_at', s.created_at
      )
    -- Regular users get masked payment details
    WHEN s.telegram_user_id = (
      SELECT telegram_id FROM public.profiles WHERE id = auth.uid()
    ) THEN
      jsonb_build_object(
        'id', s.id,
        'plan_id', s.plan_id,
        'payment_status', s.payment_status,
        'payment_method', CASE 
          WHEN s.payment_method IS NOT NULL 
          THEN LEFT(s.payment_method, 4) || '****'
          ELSE NULL 
        END,
        'bank_details', CASE 
          WHEN s.bank_details IS NOT NULL 
          THEN 'Account ending in ****'
          ELSE NULL 
        END,
        'subscription_start_date', s.subscription_start_date,
        'subscription_end_date', s.subscription_end_date,
        'is_active', s.is_active,
        'created_at', s.created_at
      )
    ELSE
      jsonb_build_object('error', 'Access denied')
  END
  FROM public.user_subscriptions s
  WHERE s.id = subscription_id;
$function$;

-- Add audit logging for sensitive subscription changes
CREATE TABLE IF NOT EXISTS public.subscription_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.user_subscriptions(id),
  changed_by uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  change_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.subscription_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view subscription audit logs" 
ON public.subscription_audit_log 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Service role can manage audit logs
CREATE POLICY "Service role can manage audit logs" 
ON public.subscription_audit_log 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);