-- Add covering indexes for unindexed foreign keys
-- This improves performance for joins and lookups on these foreign key columns

CREATE INDEX IF NOT EXISTS idx_bot_users_current_plan_id 
ON public.bot_users (current_plan_id);

CREATE INDEX IF NOT EXISTS idx_channel_memberships_added_by 
ON public.channel_memberships (added_by);

CREATE INDEX IF NOT EXISTS idx_channel_memberships_package_id 
ON public.channel_memberships (package_id);

CREATE INDEX IF NOT EXISTS idx_user_package_assignments_assigned_by 
ON public.user_package_assignments (assigned_by);
