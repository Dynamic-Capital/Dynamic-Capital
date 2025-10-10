-- Create ai_service_logs table for tracking AI/AGI/AGS calls
CREATE TABLE IF NOT EXISTS public.ai_service_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  telegram_user_id TEXT,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('ai', 'agi', 'ags', 'dai')),
  endpoint TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  status_code INTEGER,
  error_message TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_user_id ON public.ai_service_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_telegram_user_id ON public.ai_service_logs(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_session_id ON public.ai_service_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_service_type ON public.ai_service_logs(service_type);
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_created_at ON public.ai_service_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_status ON public.ai_service_logs(status_code) WHERE status_code >= 400;

-- Enable RLS
ALTER TABLE public.ai_service_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.check_user_is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id AND role = 'admin'
  );
$$;

-- Create security definer function to check user ownership
CREATE OR REPLACE FUNCTION public.user_owns_telegram_id(check_user_id UUID, check_telegram_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id AND telegram_id = check_telegram_id
  );
$$;

-- RLS Policies for ai_service_logs

-- Service role can manage all logs
CREATE POLICY "Service role can manage ai_service_logs"
ON public.ai_service_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view all logs
CREATE POLICY "Admins can view all ai_service_logs"
ON public.ai_service_logs
FOR SELECT
TO authenticated
USING (public.check_user_is_admin(auth.uid()));

-- Users can view their own logs (by user_id)
CREATE POLICY "Users can view own ai_service_logs by user_id"
ON public.ai_service_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can view their own logs (by telegram_id)
CREATE POLICY "Users can view own ai_service_logs by telegram_id"
ON public.ai_service_logs
FOR SELECT
TO authenticated
USING (
  telegram_user_id IS NOT NULL 
  AND public.user_owns_telegram_id(auth.uid(), telegram_user_id)
);

-- Users can insert their own logs
CREATE POLICY "Users can insert own ai_service_logs"
ON public.ai_service_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to ai_service_logs"
ON public.ai_service_logs
FOR ALL
TO anon
USING (false);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_ai_service_logs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_ai_service_logs_updated_at
BEFORE UPDATE ON public.ai_service_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_service_logs_updated_at();

-- Enable realtime
ALTER TABLE public.ai_service_logs REPLICA IDENTITY FULL;

-- Add to realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'ai_service_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_service_logs;
  END IF;
END
$$;

-- Add comment for documentation
COMMENT ON TABLE public.ai_service_logs IS 'Tracks all AI/AGI/AGS service calls with request/response data and performance metrics';
COMMENT ON COLUMN public.ai_service_logs.service_type IS 'Type of AI service: ai (Dynamic AI), agi (Dynamic AGI), ags (Dynamic AGS), dai (DAI Orchestrator)';
COMMENT ON COLUMN public.ai_service_logs.tokens_used IS 'Number of tokens consumed by the AI service';
COMMENT ON COLUMN public.ai_service_logs.duration_ms IS 'Request duration in milliseconds';