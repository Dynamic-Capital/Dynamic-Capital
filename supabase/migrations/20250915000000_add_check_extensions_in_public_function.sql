-- Detect extensions installed in the public schema
create or replace function public.check_extensions_in_public()
returns table(extension_name text, schema_name text)
language sql
security definer
set search_path = ''
as $$
  select e.extname::text as extension_name,
         n.nspname::text as schema_name
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where n.nspname = 'public';
$$;
