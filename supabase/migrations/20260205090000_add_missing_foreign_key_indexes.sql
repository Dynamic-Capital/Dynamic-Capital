-- Add covering indexes for foreign key columns flagged by Supabase lint
CREATE INDEX IF NOT EXISTS email_campaigns_created_by_idx
  ON public.email_campaigns (created_by);

CREATE INDEX IF NOT EXISTS enrollment_audit_log_accessed_by_idx
  ON public.enrollment_audit_log (accessed_by);

CREATE INDEX IF NOT EXISTS enrollment_audit_log_enrollment_id_idx
  ON public.enrollment_audit_log (enrollment_id);

CREATE INDEX IF NOT EXISTS session_audit_log_session_id_idx
  ON public.session_audit_log (session_id);

CREATE INDEX IF NOT EXISTS subdomain_claims_reviewed_by_idx
  ON public.subdomain_claims (reviewed_by);

CREATE INDEX IF NOT EXISTS subscription_audit_log_changed_by_idx
  ON public.subscription_audit_log (changed_by);

CREATE INDEX IF NOT EXISTS subscription_audit_log_subscription_id_idx
  ON public.subscription_audit_log (subscription_id);
