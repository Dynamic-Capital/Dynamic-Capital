-- Core schema for bank-to-DCT conversion pipeline

-- Ensure public.users exists with required governance fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  ) THEN
    CREATE TABLE public.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      telegram_id text UNIQUE,
      tier text NOT NULL DEFAULT 'tier_0',
      risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'telegram_id'
    ) THEN
      ALTER TABLE public.users
        ADD COLUMN telegram_id text;
      CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_key
        ON public.users(telegram_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'tier'
    ) THEN
      ALTER TABLE public.users
        ADD COLUMN tier text NOT NULL DEFAULT 'tier_0';
    ELSE
      ALTER TABLE public.users
        ALTER COLUMN tier SET DEFAULT 'tier_0';
      UPDATE public.users SET tier = 'tier_0' WHERE tier IS NULL;
      ALTER TABLE public.users
        ALTER COLUMN tier SET NOT NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'risk_flags'
    ) THEN
      ALTER TABLE public.users
        ADD COLUMN risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_tier_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_tier_check
      CHECK (tier IN ('tier_0', 'tier_1', 'tier_2'));
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_key
  ON public.users(telegram_id);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  amount_fiat numeric(18,2) NOT NULL,
  target_dct numeric(36,8) NOT NULL,
  status text NOT NULL CHECK (status IN (
    'draft','pending','awaiting_payment','verifying','manual_review','settled','failed','cancelled'
  )),
  reference_code text NOT NULL UNIQUE,
  quote_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  pricing_locked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_status_idx
  ON public.orders (user_id, status);
CREATE INDEX IF NOT EXISTS orders_reference_idx
  ON public.orders (reference_code);

CREATE TABLE IF NOT EXISTS public.payment_references (
  reference_code text PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id),
  status text NOT NULL CHECK (status IN ('reserved','assigned','expired','consumed')),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  UNIQUE (order_id)
);

CREATE TABLE IF NOT EXISTS public.receipt_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  storage_path text NOT NULL,
  checksum_sha256 text NOT NULL,
  file_bytes bigint NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receipt_unique_per_order UNIQUE (order_id, uploaded_by)
);

CREATE TABLE IF NOT EXISTS public.bank_events_raw (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider text NOT NULL,
  payload jsonb NOT NULL,
  signature text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  hash_sha256 text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.bank_events_normalized (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  raw_event_id bigint NOT NULL REFERENCES public.bank_events_raw(id) ON DELETE CASCADE,
  reference_code text NOT NULL,
  sender_account text,
  sender_name text,
  amount_fiat numeric(18,2) NOT NULL,
  currency text NOT NULL,
  transaction_date timestamptz NOT NULL,
  status text NOT NULL,
  UNIQUE (reference_code, sender_account, transaction_date)
);

CREATE INDEX IF NOT EXISTS bank_events_normalized_ref_idx
  ON public.bank_events_normalized (reference_code);

CREATE TABLE IF NOT EXISTS public.verification_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  rule_name text NOT NULL,
  result text NOT NULL CHECK (result IN ('pass','fail','manual_review')),
  reviewer_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_logs_order_idx
  ON public.verification_logs (order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.treasury_transfers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  tx_hash text NOT NULL UNIQUE,
  signer_public_key text NOT NULL,
  amount_dct numeric(36,8) NOT NULL,
  fee_dct numeric(36,8) DEFAULT 0,
  network text NOT NULL,
  settled_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS treasury_transfers_order_idx
  ON public.treasury_transfers (order_id);

CREATE TABLE IF NOT EXISTS public.accounting_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_type text NOT NULL CHECK (entry_type IN ('fiat','token','fee','adjustment')),
  reference_id uuid NOT NULL,
  reference_table text NOT NULL,
  debit numeric(36,8) DEFAULT 0,
  credit numeric(36,8) DEFAULT 0,
  currency text NOT NULL,
  memo text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accounting_ledger_reference_idx
  ON public.accounting_ledger (reference_table, reference_id);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  actor text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_entity_idx
  ON public.audit_events (entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.orders_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.orders_set_updated_at();

CREATE MATERIALIZED VIEW IF NOT EXISTS public.reconciliation_dashboard AS
SELECT
  o.id AS order_id,
  o.status,
  o.amount_fiat,
  o.target_dct,
  o.reference_code,
  o.updated_at,
  be.transaction_date,
  be.amount_fiat AS bank_amount,
  be.currency,
  tt.amount_dct,
  tt.tx_hash,
  GREATEST(o.updated_at, COALESCE(tt.settled_at, o.updated_at)) AS last_touch
FROM public.orders o
LEFT JOIN public.bank_events_normalized be ON be.reference_code = o.reference_code
LEFT JOIN public.treasury_transfers tt ON tt.order_id = o.id;

-- Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

ALTER TABLE public.payment_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_references FORCE ROW LEVEL SECURITY;

ALTER TABLE public.receipt_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_uploads FORCE ROW LEVEL SECURITY;

ALTER TABLE public.bank_events_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_events_raw FORCE ROW LEVEL SECURITY;

ALTER TABLE public.bank_events_normalized ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_events_normalized FORCE ROW LEVEL SECURITY;

ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.treasury_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transfers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.accounting_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ledger FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;

-- Policies for service role
CREATE POLICY IF NOT EXISTS orders_service_manage
  ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS payment_references_service_manage
  ON public.payment_references
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS receipt_uploads_service_manage
  ON public.receipt_uploads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS bank_events_raw_service_manage
  ON public.bank_events_raw
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS bank_events_normalized_service_manage
  ON public.bank_events_normalized
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS verification_logs_service_manage
  ON public.verification_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS treasury_transfers_service_manage
  ON public.treasury_transfers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS accounting_ledger_service_manage
  ON public.accounting_ledger
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS audit_events_service_manage
  ON public.audit_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can view their own orders, receipts, and settlements
CREATE POLICY IF NOT EXISTS orders_authenticated_select
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS receipt_uploads_authenticated_select
  ON public.receipt_uploads
  FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY IF NOT EXISTS treasury_transfers_authenticated_select
  ON public.treasury_transfers
  FOR SELECT
  TO authenticated
  USING (order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS verification_logs_authenticated_select
  ON public.verification_logs
  FOR SELECT
  TO authenticated
  USING (order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  ));

-- Allow authenticated users to insert receipt metadata for their orders
CREATE POLICY IF NOT EXISTS receipt_uploads_authenticated_insert
  ON public.receipt_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
