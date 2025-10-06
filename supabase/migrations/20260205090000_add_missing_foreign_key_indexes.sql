-- Add indexes for foreign key columns flagged by Supabase lint.
-- We guard every statement so the migration stays idempotent even if
-- alternative indexes already exist in the target project.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_email_campaigns_created_by'
  ) THEN
    EXECUTE 'CREATE INDEX idx_email_campaigns_created_by ON public.email_campaigns (created_by)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_enrollment_audit_accessed_by'
  ) THEN
    EXECUTE 'CREATE INDEX idx_enrollment_audit_accessed_by ON public.enrollment_audit_log (accessed_by)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_enrollment_audit_enrollment_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_enrollment_audit_enrollment_id ON public.enrollment_audit_log (enrollment_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_session_audit_session_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_session_audit_session_id ON public.session_audit_log (session_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_subdomain_claims_reviewed_by'
  ) THEN
    EXECUTE 'CREATE INDEX idx_subdomain_claims_reviewed_by ON public.subdomain_claims (reviewed_by)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_subscription_audit_changed_by'
  ) THEN
    EXECUTE 'CREATE INDEX idx_subscription_audit_changed_by ON public.subscription_audit_log (changed_by)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_subscription_audit_subscription_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_subscription_audit_subscription_id ON public.subscription_audit_log (subscription_id)';
  END IF;
END $$;
