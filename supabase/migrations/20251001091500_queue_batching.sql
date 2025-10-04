-- introduce batched queue draining helpers and scheduled archival
create extension if not exists pg_cron;

create or replace function net.dequeue_http_request_batch(batch_size integer default 50)
returns setof net.http_request_queue
language sql
security definer
set search_path = net, public
as $$
with queued as (
  select id
  from net.http_request_queue
  order by id
  for update skip locked
  limit greatest(1, batch_size)
),
removed as (
  delete from net.http_request_queue q
  using queued
  where q.id = queued.id
  returning q.*
)
select * from removed;
$$;

comment on function net.dequeue_http_request_batch(integer) is 'Pop a batch of queued HTTP requests using SKIP LOCKED semantics.';

create or replace function net.archive_http_response_batch(batch_size integer default 200, max_age interval default interval '10 minutes')
returns integer
language plpgsql
security definer
set search_path = net, public
as $$
declare
  deleted_count integer;
begin
  with expired as (
    select ctid
    from net._http_response
    where created < now() - max_age
    order by created
    limit greatest(1, batch_size)
  )
  delete from net._http_response r
  using expired
  where r.ctid = expired.ctid;

  get diagnostics deleted_count = row_count;

  return coalesce(deleted_count, 0);
end;
$$;

comment on function net.archive_http_response_batch(integer, interval) is 'Archive stale HTTP responses in deterministic batches to reduce churn.';

create index if not exists idx_http_request_queue_created on net.http_request_queue (created);
create index if not exists idx_http_response_created on net._http_response (created);

-- schedule periodic archival every minute
insert into cron.job (schedule, command, database, username, jobname)
values (
  '* * * * *',
  'select net.archive_http_response_batch(500, interval ''30 minutes'');',
  current_database(),
  current_user,
  'net_archive_http_response_batch'
)
on conflict (jobname)
do update set
  schedule = excluded.schedule,
  command = excluded.command,
  database = excluded.database,
  username = excluded.username,
  active = true;
