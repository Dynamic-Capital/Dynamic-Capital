/*
  Add indexes to optimize telegram Codex tables
*/

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc
  ON messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_user_id_created_at_desc
  ON messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_date_desc
  ON messages (date DESC);

-- EA reports table index
CREATE INDEX IF NOT EXISTS idx_ea_reports_created_at_desc
  ON ea_reports (created_at DESC);

