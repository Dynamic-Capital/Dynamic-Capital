-- Add performance indexes for auto_reply_templates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auto_reply_templates_created_at 
ON public.auto_reply_templates(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auto_reply_templates_is_active 
ON public.auto_reply_templates(is_active) 
WHERE is_active = true;
