-- Enable realtime on tables (only if not already enabled)
DO $$
BEGIN
  -- Set REPLICA IDENTITY on chat_messages
  ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
  
  -- Set REPLICA IDENTITY on chat_sessions
  ALTER TABLE public.chat_sessions REPLICA IDENTITY FULL;
  
  -- Add to publication only if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'chat_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
  END IF;
  
  -- Check and add tx_logs if it exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tx_logs') THEN
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
END
$$;