-- Analyst insights table for discretionary commentary and DAG node configuration

create table if not exists public.analyst_insights (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  bias text not null default 'NEUTRAL' check (bias in ('BUY','SELL','NEUTRAL')),
  content text,
  chart_url text,
  author text not null default 'DynamicCapital-FX',
  created_at timestamptz not null default now()
);

create index if not exists analyst_insights_created_at_idx
  on public.analyst_insights (created_at desc);

create index if not exists analyst_insights_symbol_created_at_idx
  on public.analyst_insights (symbol, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analyst_insights_chart_url_key'
  ) then
    alter table public.analyst_insights
      add constraint analyst_insights_chart_url_key unique (chart_url);
  end if;
end $$;

alter table public.analyst_insights enable row level security;

create policy analyst_insights_service_role_full_access
  on public.analyst_insights
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy analyst_insights_authenticated_select
  on public.analyst_insights
  for select
  to authenticated
  using (true);

create table if not exists public.node_configs (
  node_id text primary key,
  type text not null check (type in ('ingestion','processing','policy','community')),
  enabled boolean not null default true,
  interval_sec integer not null check (interval_sec > 0),
  dependencies jsonb not null default '[]'::jsonb,
  outputs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  weight numeric(6,3)
);

alter table public.node_configs enable row level security;

create policy node_configs_service_role_full_access
  on public.node_configs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy node_configs_authenticated_read
  on public.node_configs
  for select
  to authenticated
  using (true);

insert into public.node_configs as nc (
  node_id,
  type,
  enabled,
  interval_sec,
  dependencies,
  outputs,
  metadata,
  weight
) values (
  'human-analysis',
  'processing',
  true,
  21600,
  '[]'::jsonb,
  '["fusion"]'::jsonb,
  jsonb_build_object('source', 'analyst_insights'),
  0.25
)
on conflict (node_id) do update
  set
    type = excluded.type,
    enabled = excluded.enabled,
    interval_sec = excluded.interval_sec,
    dependencies = excluded.dependencies,
    outputs = excluded.outputs,
    metadata = excluded.metadata,
    weight = excluded.weight;
