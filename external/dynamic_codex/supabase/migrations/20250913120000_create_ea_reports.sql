/*
  Create ea_reports table for storing EA performance stats
*/

CREATE TABLE IF NOT EXISTS ea_reports (
  id serial PRIMARY KEY,
  report jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ea_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert ea_reports"
  ON ea_reports
  FOR INSERT
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can read ea_reports"
  ON ea_reports
  FOR SELECT
  TO authenticated
  USING (true);
