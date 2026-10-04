-- Byte sizes of the R2 objects behind each photo, recorded at upload so
-- storage usage can be summed in SQL instead of listing the whole bucket.
-- Rows uploaded before this migration stay at 0 until
-- scripts/backfill-photo-sizes.mjs is run.
alter table public.photos
  add column if not exists original_size bigint not null default 0,
  add column if not exists thumbnail_size bigint not null default 0;

-- Both functions run as the caller (security invoker), so RLS limits them to
-- the photos the signed-in user can already see.

-- Photo count per event, for the admin dashboard
create or replace function public.photo_counts()
returns table (event_slug text, photo_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.event_slug::text, count(*)
  from public.photos p
  group by p.event_slug;
$$;

-- Total bytes stored in R2 (originals + thumbnails)
create or replace function public.storage_usage()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(p.original_size + p.thumbnail_size), 0)::bigint
  from public.photos p;
$$;

revoke execute on function public.photo_counts() from public, anon;
revoke execute on function public.storage_usage() from public, anon;
grant execute on function public.photo_counts() to authenticated;
grant execute on function public.storage_usage() to authenticated;
