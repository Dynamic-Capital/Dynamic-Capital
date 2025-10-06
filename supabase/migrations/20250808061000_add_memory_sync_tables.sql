-- Create tables to store memory core metadata and sync snapshots
create table if not exists public.memory_cores (
  id text primary key,
  display_name text not null,
  provider text not null,
  link text not null,
  capacity_gb numeric,
  used_gb numeric,
  pending_gb numeric,
  sync_source text not null,
  sustained_throughput_mbps numeric,
  priority text not null default 'medium',
  updated_at timestamptz not null default now(),
  constraint memory_cores_priority_check
    check (priority in ('low', 'medium', 'high'))
);

comment on table public.memory_cores is 'External memory core endpoints that participate in scheduled exports.';
comment on column public.memory_cores.id is 'Stable identifier for the memory core, matching config/export targets.';
comment on column public.memory_cores.display_name is 'Human readable label displayed in operational tooling.';
comment on column public.memory_cores.provider is 'Storage provider hosting the memory core (Google Drive, OneDrive, etc.).';
comment on column public.memory_cores.link is 'Direct sharing link or mount point URL for the storage location.';
comment on column public.memory_cores.capacity_gb is 'Total storage capacity in gigabytes.';
comment on column public.memory_cores.used_gb is 'Currently utilized storage capacity in gigabytes.';
comment on column public.memory_cores.pending_gb is 'Outstanding backlog in gigabytes awaiting export.';
comment on column public.memory_cores.sync_source is 'Identifier for the sync source feeding the export target.';
comment on column public.memory_cores.sustained_throughput_mbps is 'Measured sustained throughput in megabits per second.';
comment on column public.memory_cores.priority is 'Operational priority level for scheduling exports.';
comment on column public.memory_cores.updated_at is 'Timestamp when the record was last refreshed from automation.';

create index if not exists memory_cores_priority_idx
  on public.memory_cores(priority);

create table if not exists public.memory_sync_snapshots (
  id uuid primary key default gen_random_uuid(),
  core_id text not null references public.memory_cores(id) on delete cascade,
  captured_at timestamptz not null default now(),
  observed_latency_ms numeric,
  observed_jitter_ms numeric,
  observed_offset_ms numeric,
  backlog_gb numeric,
  available_gb numeric,
  recommended_batch_gb numeric,
  batches_required integer,
  recommended_parallelism integer,
  estimated_duration_minutes numeric,
  sync_health numeric,
  score numeric,
  issues jsonb,
  target_latency_ms numeric,
  max_jitter_seconds numeric,
  offset_tolerance_ms numeric,
  horizon_minutes numeric
);

comment on table public.memory_sync_snapshots is 'Historical snapshots of sync health and export planning metrics for each memory core.';
comment on column public.memory_sync_snapshots.core_id is 'Memory core identifier the snapshot applies to.';
comment on column public.memory_sync_snapshots.captured_at is 'Timestamp when the snapshot was recorded.';
comment on column public.memory_sync_snapshots.observed_latency_ms is 'Observed end-to-end latency in milliseconds.';
comment on column public.memory_sync_snapshots.observed_jitter_ms is 'Observed jitter in milliseconds.';
comment on column public.memory_sync_snapshots.observed_offset_ms is 'Clock offset observed between orchestrator and storage in milliseconds.';
comment on column public.memory_sync_snapshots.backlog_gb is 'Current backlog awaiting export in gigabytes.';
comment on column public.memory_sync_snapshots.available_gb is 'Free capacity in gigabytes.';
comment on column public.memory_sync_snapshots.recommended_batch_gb is 'Recommended batch size in gigabytes for the next export run.';
comment on column public.memory_sync_snapshots.batches_required is 'Number of batches required to clear the backlog.';
comment on column public.memory_sync_snapshots.recommended_parallelism is 'Recommended parallel streams for the export.';
comment on column public.memory_sync_snapshots.estimated_duration_minutes is 'Estimated batch duration in minutes per stream.';
comment on column public.memory_sync_snapshots.sync_health is 'Composite health score derived from latency, jitter, and offset measurements.';
comment on column public.memory_sync_snapshots.score is 'Composite scheduling score including capacity and priority adjustments.';
comment on column public.memory_sync_snapshots.issues is 'JSON array of issues detected while building the export plan.';
comment on column public.memory_sync_snapshots.target_latency_ms is 'Configured latency target in milliseconds.';
comment on column public.memory_sync_snapshots.max_jitter_seconds is 'Configured jitter threshold in seconds.';
comment on column public.memory_sync_snapshots.offset_tolerance_ms is 'Configured offset tolerance in milliseconds.';
comment on column public.memory_sync_snapshots.horizon_minutes is 'Planning horizon in minutes used when computing the schedule.';

create index if not exists memory_sync_snapshots_core_captured_idx
  on public.memory_sync_snapshots(core_id, captured_at desc);

alter table public.memory_cores enable row level security;
alter table public.memory_sync_snapshots enable row level security;

create policy if not exists "memory_cores_service_all"
  on public.memory_cores for all
  to service_role
  using (true)
  with check (true);

create policy if not exists "memory_cores_authenticated_read"
  on public.memory_cores for select
  to authenticated
  using (true);

create policy if not exists "memory_sync_snapshots_service_all"
  on public.memory_sync_snapshots for all
  to service_role
  using (true)
  with check (true);

create policy if not exists "memory_sync_snapshots_authenticated_read"
  on public.memory_sync_snapshots for select
  to authenticated
  using (true);

create or replace function public.set_memory_core_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists memory_cores_set_updated_at on public.memory_cores;
create trigger memory_cores_set_updated_at
  before update on public.memory_cores
  for each row execute function public.set_memory_core_updated_at();
