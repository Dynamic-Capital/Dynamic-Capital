-- Mentor feedback table captures mentor-to-mentee satisfaction submissions
CREATE TABLE IF NOT EXISTS public.mentor_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  mentee_telegram_id text,
  score numeric(2, 1) NOT NULL CHECK (score >= 0 AND score <= 5),
  notes text,
  source text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_feedback_submitted_at
  ON public.mentor_feedback(submitted_at DESC);

ALTER TABLE public.mentor_feedback ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.count_executed_signals_since(p_start timestamptz)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
SELECT COUNT(*)::bigint
FROM public.signals
WHERE status = 'executed'
  AND executed_at IS NOT NULL
  AND executed_at >= p_start;
$$;
