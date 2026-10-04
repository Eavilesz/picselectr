-- storage_usage() reports the whole R2 bucket (every studio's photos), not
-- just the caller's. security definer lets it read past RLS; it only ever
-- returns a single total, and execute stays limited to signed-in users.
create or replace function public.storage_usage()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(p.original_size + p.thumbnail_size), 0)::bigint
  from public.photos p;
$$;
