-- Fix critical security vulnerability: Customer personal data protection
-- Enhance RLS policies and add data masking for education enrollments

-- First, let's ensure the get_current_user_telegram_id function is properly implemented
CREATE OR REPLACE FUNCTION public.get_current_user_telegram_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT telegram_id FROM public.profiles WHERE id = auth.uid();
$function$;

-- Drop and recreate policies with more explicit and secure logic
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.education_enrollments;
DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.education_enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.education_enrollments;
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.education_enrollments;

-- Create secure policy for users to view only their own enrollment records
CREATE POLICY "Users can view own enrollments only" 
ON public.education_enrollments 
FOR SELECT 
TO authenticated
USING (
  -- Match student_telegram_id with the user's telegram_id from profiles
  student_telegram_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Create policy for users to create their own enrollments
CREATE POLICY "Users can create own enrollments only" 
ON public.education_enrollments 
FOR INSERT 
TO authenticated
WITH CHECK (
  student_telegram_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Create policy for users to update only their own enrollments (limited fields)
CREATE POLICY "Users can update own enrollments only" 
ON public.education_enrollments 
FOR UPDATE 
TO authenticated
USING (
  student_telegram_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  student_telegram_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Create policy for admins to manage all enrollments
CREATE POLICY "Admins can manage all education enrollments" 
ON public.education_enrollments 
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

-- Create a security function to mask sensitive personal data
CREATE OR REPLACE FUNCTION public.get_masked_enrollment_info(enrollment_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT CASE 
    -- Admins get full access to all enrollment details
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      jsonb_build_object(
        'id', e.id,
        'package_id', e.package_id,
        'student_telegram_id', e.student_telegram_id,
        'student_first_name', e.student_first_name,
        'student_last_name', e.student_last_name,
        'student_email', e.student_email,
        'student_phone', e.student_phone,
        'student_telegram_username', e.student_telegram_username,
        'enrollment_status', e.enrollment_status,
        'payment_status', e.payment_status,
        'payment_method', e.payment_method,
        'payment_amount', e.payment_amount,
        'enrollment_date', e.enrollment_date,
        'start_date', e.start_date,
        'completion_date', e.completion_date,
        'progress_percentage', e.progress_percentage
      )
    -- Regular users get masked personal info (their own enrollments only)
    WHEN e.student_telegram_id = (
      SELECT telegram_id FROM public.profiles WHERE id = auth.uid()
    ) THEN
      jsonb_build_object(
        'id', e.id,
        'package_id', e.package_id,
        'student_first_name', e.student_first_name,
        'student_last_name', e.student_last_name,
        'student_email', CASE 
          WHEN e.student_email IS NOT NULL 
          THEN LEFT(e.student_email, 3) || '****@' || SPLIT_PART(e.student_email, '@', 2)
          ELSE NULL 
        END,
        'student_phone', CASE 
          WHEN e.student_phone IS NOT NULL 
          THEN '****' || RIGHT(e.student_phone, 4)
          ELSE NULL 
        END,
        'enrollment_status', e.enrollment_status,
        'payment_status', e.payment_status,
        'enrollment_date', e.enrollment_date,
        'start_date', e.start_date,
        'completion_date', e.completion_date,
        'progress_percentage', e.progress_percentage
      )
    ELSE
      jsonb_build_object('error', 'Access denied')
  END
  FROM public.education_enrollments e
  WHERE e.id = enrollment_id;
$function$;

-- Create enrollment audit logging for security monitoring
CREATE TABLE IF NOT EXISTS public.enrollment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES public.education_enrollments(id),
  student_telegram_id text NOT NULL,
  accessed_by uuid REFERENCES auth.users(id),
  action_type text NOT NULL, -- 'created', 'viewed', 'updated', 'status_changed'
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  access_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on enrollment audit log
ALTER TABLE public.enrollment_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view all enrollment audit logs
CREATE POLICY "Only admins can view all enrollment audit logs" 
ON public.enrollment_audit_log 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Users can view their own enrollment audit logs
CREATE POLICY "Users can view own enrollment audit logs" 
ON public.enrollment_audit_log 
FOR SELECT 
TO authenticated
USING (
  student_telegram_id = (
    SELECT telegram_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Service role can manage audit logs
CREATE POLICY "Service role can manage enrollment audit logs" 
ON public.enrollment_audit_log 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to handle data privacy compliance (GDPR-style data deletion)
CREATE OR REPLACE FUNCTION public.anonymize_enrollment_data(enrollment_id uuid, admin_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  enrollment_record RECORD;
  is_admin BOOLEAN := false;
BEGIN
  -- Check if the requesting user is an admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_user_id 
    AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN jsonb_build_object('error', 'Only admins can anonymize enrollment data');
  END IF;
  
  -- Get current enrollment data for audit
  SELECT * INTO enrollment_record 
  FROM public.education_enrollments 
  WHERE id = enrollment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Enrollment not found');
  END IF;
  
  -- Anonymize the personal data
  UPDATE public.education_enrollments 
  SET 
    student_first_name = 'ANONYMIZED',
    student_last_name = 'USER',
    student_email = 'anonymized@privacy.local',
    student_phone = NULL,
    student_telegram_username = NULL,
    notes = 'Data anonymized for privacy compliance'
  WHERE id = enrollment_id;
  
  -- Log the anonymization
  INSERT INTO public.enrollment_audit_log (
    enrollment_id, 
    student_telegram_id, 
    accessed_by,
    action_type, 
    old_values,
    new_values,
    access_reason
  ) VALUES (
    enrollment_id,
    enrollment_record.student_telegram_id,
    admin_user_id,
    'anonymized',
    row_to_json(enrollment_record)::jsonb,
    jsonb_build_object('status', 'anonymized'),
    'GDPR compliance - user data anonymized'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'enrollment_id', enrollment_id,
    'anonymized_at', NOW()
  );
END;
$function$;

-- Add indexes for better performance and security
CREATE INDEX IF NOT EXISTS idx_education_enrollments_student_telegram_id ON public.education_enrollments(student_telegram_id);
CREATE INDEX IF NOT EXISTS idx_education_enrollments_status ON public.education_enrollments(enrollment_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_enrollment_audit_student_id ON public.enrollment_audit_log(student_telegram_id, created_at);

-- Add a trigger to automatically log enrollment access
CREATE OR REPLACE FUNCTION public.log_enrollment_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Only log if this is a real user access (not service role)
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.enrollment_audit_log (
      enrollment_id,
      student_telegram_id,
      accessed_by,
      action_type,
      new_values
    ) VALUES (
      NEW.id,
      NEW.student_telegram_id,
      auth.uid(),
      TG_OP::text,
      row_to_json(NEW)::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for enrollment access logging
DROP TRIGGER IF EXISTS enrollment_access_trigger ON public.education_enrollments;
CREATE TRIGGER enrollment_access_trigger
  AFTER INSERT OR UPDATE ON public.education_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_enrollment_access();
