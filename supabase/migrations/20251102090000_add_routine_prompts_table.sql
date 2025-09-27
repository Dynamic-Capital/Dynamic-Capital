-- Create routine_prompts table for Dynamic AI routine allocator
CREATE TABLE IF NOT EXISTS public.routine_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_slot text NOT NULL,
  category text,
  title text,
  tip text,
  quote text,
  notification text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure consistent lookups by time slot
CREATE UNIQUE INDEX IF NOT EXISTS routine_prompts_time_slot_idx
  ON public.routine_prompts (time_slot);

-- Enforce row level security with minimal surface area
ALTER TABLE public.routine_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_prompts FORCE ROW LEVEL SECURITY;

CREATE POLICY routine_prompts_service_all
  ON public.routine_prompts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY routine_prompts_authenticated_read
  ON public.routine_prompts
  FOR SELECT
  TO authenticated
  USING (true);
