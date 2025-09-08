-- Add table to track processed Telegram updates for idempotency
CREATE TABLE IF NOT EXISTS public.webhook_updates (
  update_id bigint PRIMARY KEY,
  inserted_at timestamptz DEFAULT now()
);

-- Enable RLS (no policies required as service role inserts)
ALTER TABLE public.webhook_updates ENABLE ROW LEVEL SECURITY;
