-- Clear all pending payments and related data
UPDATE payments SET status = 'cancelled' WHERE status = 'pending';

-- Clear any related user subscriptions that are pending
UPDATE user_subscriptions SET payment_status = 'cancelled' WHERE payment_status = 'pending';

-- Clear any pending education enrollments
UPDATE education_enrollments SET payment_status = 'cancelled' WHERE payment_status = 'pending';

-- Reset any active user sessions that might be stuck
UPDATE user_sessions SET is_active = false, ended_at = now(), end_reason = 'admin_reset' WHERE is_active = true;
