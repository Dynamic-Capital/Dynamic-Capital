-- Create tx_logs table for audit trail
CREATE TABLE IF NOT EXISTS tx_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  telegram_user_id TEXT,
  metadata JSONB,
  severity TEXT CHECK (severity IN ('info', 'warn', 'error', 'critical'))
);

CREATE INDEX idx_tx_logs_created_at ON tx_logs(created_at DESC);
CREATE INDEX idx_tx_logs_event_type ON tx_logs(event_type);
CREATE INDEX idx_tx_logs_telegram_user ON tx_logs(telegram_user_id);

-- Enable RLS
ALTER TABLE tx_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins view all logs"
  ON tx_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bot_users 
      WHERE bot_users.telegram_id = (auth.jwt()->>'telegram_user_id')
      AND bot_users.is_admin = true
    )
  );

-- Service role can insert logs
CREATE POLICY "Service role can insert logs"
  ON tx_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Secure education_enrollments table
ALTER TABLE education_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own enrollments only" ON education_enrollments;
DROP POLICY IF EXISTS "Users can create own enrollments only" ON education_enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments only" ON education_enrollments;

CREATE POLICY "Students and admins view enrollments"
  ON education_enrollments FOR SELECT
  USING (
    student_telegram_id = (
      SELECT telegram_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role manages enrollments"
  ON education_enrollments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Secure user_sessions table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_sessions') THEN
    ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users view own sessions" ON user_sessions;
    
    CREATE POLICY "Users view own sessions"
      ON user_sessions FOR SELECT
      USING (telegram_user_id = (
        SELECT telegram_id FROM profiles WHERE id = auth.uid()
      ));
    
    CREATE POLICY "Service role manages sessions"
      ON user_sessions FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;