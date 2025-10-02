-- Phase 1: Chat Interface Database Schema

-- Add ton_wallet_address column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ton_wallet_address text;

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id text,
  title text DEFAULT 'New Chat',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions"
  ON public.chat_sessions FOR SELECT
  USING (
    auth.uid() = user_id 
    OR telegram_id = (SELECT telegram_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create their own chat sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR telegram_id = (SELECT telegram_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own chat sessions"
  ON public.chat_sessions FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR telegram_id = (SELECT telegram_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Service role can manage all chat sessions"
  ON public.chat_sessions FOR ALL
  USING (true);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages from their sessions"
  ON public.chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.chat_sessions 
      WHERE user_id = auth.uid() 
      OR telegram_id = (SELECT telegram_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.chat_sessions 
      WHERE user_id = auth.uid() 
      OR telegram_id = (SELECT telegram_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Service role can manage all chat messages"
  ON public.chat_messages FOR ALL
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_telegram_id ON public.chat_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Updated_at trigger for chat_sessions
CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_updated_at();