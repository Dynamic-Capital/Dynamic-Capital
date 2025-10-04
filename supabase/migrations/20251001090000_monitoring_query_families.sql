-- monitor query families and expose scorecard refresh routine
create schema if not exists monitoring;

create table if not exists monitoring.query_family_rollups (
    recorded_at timestamptz not null default now(),
    query_family text not null,
    calls bigint not null,
    total_time_ms numeric not null,
    mean_time_ms numeric not null,
    rows_returned bigint not null,
    constraint query_family_rollups_pk primary key (recorded_at, query_family)
);

comment on table monitoring.query_family_rollups is 'Historical snapshots of high-impact query families sourced from pg_stat_statements.';

create extension if not exists pg_stat_statements;
create extension if not exists pg_cron;

create or replace function monitoring.refresh_query_family_rollups()
returns void
language plpgsql
security definer
set search_path = public, monitoring
as $$
declare
begin
  insert into monitoring.query_family_rollups (
    recorded_at,
    query_family,
    calls,
    total_time_ms,
    mean_time_ms,
    rows_returned
  )
  select
    now() as recorded_at,
    query_family,
    sum(calls) as calls,
    sum(total_exec_time) as total_time_ms,
    avg(mean_exec_time) as mean_time_ms,
    sum(rows) as rows_returned
  from (
    select
      case
        when query ilike 'select * from realtime.list_changes%' then 'realtime.list_changes'
        when query ilike 'with    rows as (%http_request_queue%' escape '\\' then 'net.http_request_queue maintenance'
        when query ilike 'with    rows as (%_http_response%' escape '\\' then 'net._http_response maintenance'
        when query ilike 'with table_info as (%' and query ilike '%information_schema.columns%' then 'metadata introspection'
        when query ilike 'with tables as (%' and query ilike '%pg_namespace%' and query ilike '%pg_class%' then 'metadata tables overview'
        when query ilike 'with f as (%' and query ilike '%pg_proc%' then 'function catalog export'
        when query ilike 'select %from storage.search%' then 'storage.search'
        when query ilike 'select%net.http_post%' then 'net.http_post'
        else null
      end as query_family,
      calls,
      total_exec_time,
      mean_exec_time,
      rows
    from pg_stat_statements
  ) grouped
  where query_family is not null
  group by query_family;

  -- keep only 30 days of history
  delete from monitoring.query_family_rollups
  where recorded_at < now() - interval '30 days';
end;
$$;

comment on function monitoring.refresh_query_family_rollups() is 'Aggregate pg_stat_statements into named query families and persist a snapshot.';

create or replace view monitoring.query_family_scorecard as
select distinct on (query_family)
  query_family,
  recorded_at,
  calls,
  total_time_ms,
  mean_time_ms,
  rows_returned
from monitoring.query_family_rollups
order by query_family, recorded_at desc;

comment on view monitoring.query_family_scorecard is 'Latest snapshot per query family for dashboard consumption.';

create or replace function monitoring.get_query_family_scorecard()
returns table (
  query_family text,
  recorded_at timestamptz,
  calls bigint,
  total_time_ms numeric,
  mean_time_ms numeric,
  rows_returned bigint,
  calls_delta numeric,
  total_time_delta numeric
)
language sql
security definer
set search_path = monitoring, public
as $$
with ranked as (
  select
    query_family,
    recorded_at,
    calls,
    total_time_ms,
    mean_time_ms,
    rows_returned,
    row_number() over (partition by query_family order by recorded_at desc) as rn
  from monitoring.query_family_rollups
)
select
  latest.query_family,
  latest.recorded_at,
  latest.calls,
  latest.total_time_ms,
  latest.mean_time_ms,
  latest.rows_returned,
  case when previous.calls is not null then latest.calls - previous.calls end as calls_delta,
  case when previous.total_time_ms is not null then latest.total_time_ms - previous.total_time_ms end as total_time_delta
from ranked latest
left join ranked previous
  on previous.query_family = latest.query_family
 and previous.rn = 2
where latest.rn = 1;
$$;

comment on function monitoring.get_query_family_scorecard() is 'Return the latest query family metrics with deltas against the prior snapshot.';

-- upsert cron job for refresh (idempotent)
insert into cron.job (schedule, command, database, username, jobname)
values (
  '*/5 * * * *',
  'select monitoring.refresh_query_family_rollups();',
  current_database(),
  current_user,
  'monitoring_refresh_query_families'
)
on conflict (jobname)
do update set
  schedule = excluded.schedule,
  command = excluded.command,
  database = excluded.database,
  username = excluded.username,
  active = true;
