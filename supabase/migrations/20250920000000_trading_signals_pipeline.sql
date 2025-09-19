-- Trading automation schema for the TradingView → Supabase → MT5 bridge

-- Ensure enums exist for status columns used by the bridge tables
DO $$ BEGIN
  CREATE TYPE public.signal_status_enum AS ENUM (
    'pending',
    'claimed',
    'processing',
    'executed',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.trade_status_enum AS ENUM (
    'pending',
    'executing',
    'partial_fill',
    'filled',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.signal_dispatch_status_enum AS ENUM (
    'pending',
    'claimed',
    'processing',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.trading_account_status_enum AS ENUM (
    'active',
    'maintenance',
    'disabled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Master record for MT5 / copier accounts
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL UNIQUE,
  display_name text,
  broker text,
  environment text NOT NULL DEFAULT 'demo' CHECK (environment IN ('demo', 'live')),
  status public.trading_account_status_enum NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_heartbeat_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_trading_accounts_status_env
  ON public.trading_accounts(status, environment);

DROP TRIGGER IF EXISTS trg_trading_accounts_updated_at ON public.trading_accounts;
CREATE TRIGGER trg_trading_accounts_updated_at
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Incoming TradingView alerts normalized for MT5 consumption
CREATE TABLE IF NOT EXISTS public.signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id text NOT NULL,
  account_id uuid REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'tradingview',
  symbol text NOT NULL,
  timeframe text,
  direction text NOT NULL CHECK (direction IN ('long', 'short', 'flat')),
  order_type text NOT NULL DEFAULT 'market' CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
  status public.signal_status_enum NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_reason text,
  next_poll_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  last_heartbeat_at timestamptz,
  executed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signals_alert_id_unique UNIQUE (alert_id)
);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_signals_status_poll
  ON public.signals(status, next_poll_at, priority DESC, created_at)
  WHERE status IN ('pending', 'claimed', 'processing');

CREATE INDEX IF NOT EXISTS idx_signals_account_status
  ON public.signals(account_id, status);

DROP TRIGGER IF EXISTS trg_signals_updated_at ON public.signals;
CREATE TRIGGER trg_signals_updated_at
  BEFORE UPDATE ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Worker dispatch tracking so the MT5 bridge can record heartbeats
CREATE TABLE IF NOT EXISTS public.signal_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  worker_id text NOT NULL,
  status public.signal_dispatch_status_enum NOT NULL DEFAULT 'claimed',
  retry_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signal_dispatches ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_signal_dispatches_signal
  ON public.signal_dispatches(signal_id, created_at);

CREATE INDEX IF NOT EXISTS idx_signal_dispatches_status
  ON public.signal_dispatches(status, claimed_at);

DROP TRIGGER IF EXISTS trg_signal_dispatches_updated_at ON public.signal_dispatches;
CREATE TRIGGER trg_signal_dispatches_updated_at
  BEFORE UPDATE ON public.signal_dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Executed MT5 trades mapped back to originating signals
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES public.signals(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  mt5_ticket_id bigint,
  status public.trade_status_enum NOT NULL DEFAULT 'pending',
  symbol text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('long', 'short', 'flat')),
  order_type text NOT NULL DEFAULT 'market' CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
  volume numeric(14, 2),
  requested_price numeric(18, 8),
  filled_price numeric(18, 8),
  stop_loss numeric(18, 8),
  take_profit numeric(18, 8),
  execution_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_reason text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  filled_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trades_mt5_ticket_unique UNIQUE (mt5_ticket_id)
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_trades_status_opened
  ON public.trades(status, opened_at);

CREATE INDEX IF NOT EXISTS idx_trades_signal
  ON public.trades(signal_id);

CREATE INDEX IF NOT EXISTS idx_trades_open_accounts
  ON public.trades(account_id, status)
  WHERE status IN ('pending', 'executing', 'partial_fill');

DROP TRIGGER IF EXISTS trg_trades_updated_at ON public.trades;
CREATE TRIGGER trg_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Expose the new tables via realtime so the MT5 listener can subscribe
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- RPC helpers for the MT5 bridge workflow
CREATE OR REPLACE FUNCTION public.claim_trading_signal(
  p_worker_id text,
  p_account_code text DEFAULT NULL
)
RETURNS public.signals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal public.signals;
  v_account_id uuid;
  v_retry integer := 0;
BEGIN
  IF coalesce(trim(p_worker_id), '') = '' THEN
    RAISE EXCEPTION 'worker_id is required';
  END IF;

  IF p_account_code IS NOT NULL THEN
    SELECT id INTO v_account_id
    FROM public.trading_accounts
    WHERE account_code = p_account_code
    LIMIT 1;
  END IF;

  WITH candidate AS (
    SELECT s.id
    FROM public.signals s
    WHERE s.status = 'pending'
      AND (v_account_id IS NULL OR s.account_id = v_account_id)
    ORDER BY s.priority DESC, s.next_poll_at, s.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.signals s
  SET status = 'claimed',
      acknowledged_at = now(),
      last_heartbeat_at = now(),
      updated_at = now()
  FROM candidate c
  WHERE s.id = c.id
  RETURNING s.* INTO v_signal;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(max(retry_count) + 1, 0) INTO v_retry
  FROM public.signal_dispatches
  WHERE signal_id = v_signal.id;

  INSERT INTO public.signal_dispatches (
    signal_id,
    worker_id,
    status,
    retry_count,
    metadata,
    claimed_at,
    last_heartbeat_at,
    created_at,
    updated_at
  )
  VALUES (
    v_signal.id,
    p_worker_id,
    'claimed',
    v_retry,
    '{}'::jsonb,
    now(),
    now(),
    now(),
    now()
  );

  RETURN v_signal;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_trading_signal_status(
  p_signal_id uuid,
  p_status public.signal_status_enum,
  p_error text DEFAULT NULL,
  p_next_poll_at timestamptz DEFAULT NULL,
  p_worker_id text DEFAULT NULL,
  p_dispatch_status public.signal_dispatch_status_enum DEFAULT NULL
)
RETURNS public.signals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal public.signals;
  v_now timestamptz := now();
  v_dispatch_id uuid;
BEGIN
  UPDATE public.signals
  SET status = p_status,
      error_reason = p_error,
      next_poll_at = COALESCE(p_next_poll_at, next_poll_at),
      last_heartbeat_at = CASE WHEN p_worker_id IS NOT NULL THEN v_now ELSE last_heartbeat_at END,
      executed_at = CASE WHEN p_status = 'executed' THEN COALESCE(executed_at, v_now) ELSE executed_at END,
      cancelled_at = CASE WHEN p_status = 'cancelled' THEN COALESCE(cancelled_at, v_now) ELSE cancelled_at END,
      updated_at = v_now
  WHERE id = p_signal_id
  RETURNING * INTO v_signal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'signal % not found', p_signal_id;
  END IF;

  IF p_worker_id IS NOT NULL THEN
    SELECT id INTO v_dispatch_id
    FROM public.signal_dispatches
    WHERE signal_id = p_signal_id
      AND worker_id = p_worker_id
    ORDER BY claimed_at DESC
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.signal_dispatches
      SET status = COALESCE(p_dispatch_status, status),
          last_heartbeat_at = v_now,
          completed_at = CASE
            WHEN COALESCE(p_dispatch_status, status) = 'completed'
              THEN COALESCE(completed_at, v_now)
            ELSE completed_at
          END,
          failed_at = CASE
            WHEN COALESCE(p_dispatch_status, status) = 'failed'
              THEN COALESCE(failed_at, v_now)
            ELSE failed_at
          END,
          updated_at = v_now
      WHERE id = v_dispatch_id;
    END IF;
  END IF;

  RETURN v_signal;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_trade_update(
  p_signal_id uuid,
  p_mt5_ticket_id bigint,
  p_status public.trade_status_enum,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal public.signals;
  v_trade public.trades;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_signal
  FROM public.signals
  WHERE id = p_signal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'signal % not found', p_signal_id;
  END IF;

  INSERT INTO public.trades (
    signal_id,
    account_id,
    mt5_ticket_id,
    status,
    symbol,
    direction,
    order_type,
    volume,
    requested_price,
    filled_price,
    stop_loss,
    take_profit,
    execution_payload,
    error_reason,
    opened_at,
    filled_at,
    closed_at,
    created_at,
    updated_at
  )
  VALUES (
    v_signal.id,
    v_signal.account_id,
    p_mt5_ticket_id,
    p_status,
    v_signal.symbol,
    v_signal.direction,
    v_signal.order_type,
    NULLIF(p_payload ->> 'volume', '')::numeric,
    NULLIF(p_payload ->> 'requested_price', '')::numeric,
    NULLIF(p_payload ->> 'filled_price', '')::numeric,
    NULLIF(p_payload ->> 'stop_loss', '')::numeric,
    NULLIF(p_payload ->> 'take_profit', '')::numeric,
    COALESCE(p_payload, '{}'::jsonb),
    p_payload ->> 'error_reason',
    COALESCE(NULLIF(p_payload ->> 'opened_at', '')::timestamptz, v_now),
    NULLIF(p_payload ->> 'filled_at', '')::timestamptz,
    NULLIF(p_payload ->> 'closed_at', '')::timestamptz,
    v_now,
    v_now
  )
  ON CONFLICT (mt5_ticket_id) DO UPDATE
    SET status = EXCLUDED.status,
        execution_payload = COALESCE(p_payload, '{}'::jsonb),
        volume = EXCLUDED.volume,
        requested_price = EXCLUDED.requested_price,
        filled_price = EXCLUDED.filled_price,
        stop_loss = EXCLUDED.stop_loss,
        take_profit = EXCLUDED.take_profit,
        error_reason = EXCLUDED.error_reason,
        filled_at = COALESCE(EXCLUDED.filled_at, trades.filled_at),
        closed_at = COALESCE(EXCLUDED.closed_at, trades.closed_at),
        updated_at = v_now
  RETURNING * INTO v_trade;

  RETURN v_trade;
END;
$$;
