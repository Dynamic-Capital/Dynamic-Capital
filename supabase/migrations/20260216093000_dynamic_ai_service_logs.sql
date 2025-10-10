-- Create AI service log table for tracking copilot usage
CREATE TABLE IF NOT EXISTS public.ai_service_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.chat_sessions (id) ON DELETE SET NULL,
  service_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb,
  error_message text,
  latency_ms integer,
  model text,
  tokens_in integer,
  tokens_out integer,
  metadata jsonb
);

COMMENT ON TABLE public.ai_service_logs IS 'Telemetry for Dynamic AI/AGI/AGS service activity, including latency, usage, and outcomes.';

CREATE INDEX IF NOT EXISTS idx_ai_service_logs_created_at
  ON public.ai_service_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_user_id
  ON public.ai_service_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_service_name
  ON public.ai_service_logs (service_name);

ALTER TABLE public.ai_service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage ai service logs"
  ON public.ai_service_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their ai service logs"
  ON public.ai_service_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their ai service logs"
  ON public.ai_service_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  -- Ensure AI service logs stream through realtime
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_service_logs'
  ) THEN
    ALTER TABLE public.ai_service_logs REPLICA IDENTITY FULL;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'ai_service_logs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_service_logs;
    END IF;
  END IF;

  -- Ensure chat messages publish realtime events
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'chat_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
  END IF;

  -- Ensure transaction logs emit realtime notifications when available
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tx_logs'
  ) THEN
    ALTER TABLE public.tx_logs REPLICA IDENTITY FULL;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'tx_logs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tx_logs;
    END IF;
  END IF;
END;
$$;
