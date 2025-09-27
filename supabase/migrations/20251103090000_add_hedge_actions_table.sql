-- Hedge actions lifecycle tracking for Dynamic Hedge Model

-- Enum definitions
DO $$ BEGIN
  CREATE TYPE public.hedge_action_side_enum AS ENUM ('LONG_HEDGE', 'SHORT_HEDGE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.hedge_action_reason_enum AS ENUM ('ATR_SPIKE', 'NEWS', 'DD_LIMIT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.hedge_action_status_enum AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.hedge_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  hedge_symbol text NOT NULL,
  side public.hedge_action_side_enum NOT NULL,
  qty numeric(18,6) NOT NULL,
  reason public.hedge_action_reason_enum NOT NULL,
  status public.hedge_action_status_enum NOT NULL DEFAULT 'OPEN',
  entry_price numeric(18,8),
  close_price numeric(18,8),
  pnl numeric(18,8),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE public.hedge_actions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS hedge_actions_status_idx
  ON public.hedge_actions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS hedge_actions_symbol_idx
  ON public.hedge_actions (symbol, created_at DESC);

CREATE POLICY hedge_actions_service_role_full_access
  ON public.hedge_actions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY hedge_actions_authenticated_select
  ON public.hedge_actions
  FOR SELECT
  TO authenticated
  USING (true);
