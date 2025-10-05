-- Persist Dynamic AGI self-improvement telemetry for long-term analysis
create table if not exists agi_improvement_history (
  id uuid primary key default gen_random_uuid(),
  snapshot_timestamp timestamptz not null,
  plan_generated_at timestamptz not null,
  model_version text,
  model_version_info jsonb,
  snapshot jsonb not null,
  improvement_plan jsonb not null,
  created_at timestamptz not null default now()
);

alter table agi_improvement_history enable row level security;

create policy if not exists "Service role manages agi improvement history"
  on agi_improvement_history
  for all
  to service_role
  using (true)
  with check (true);

create policy if not exists "Authenticated read agi improvement history"
  on agi_improvement_history
  for select
  to authenticated
  using (true);

create index if not exists idx_agi_improvement_history_snapshot_ts
  on agi_improvement_history (snapshot_timestamp desc);

create index if not exists idx_agi_improvement_history_model_version
  on agi_improvement_history (model_version);
