-- Delivery galleries: the final edited photos a studio hands to its client.
-- Independent from events (selection). Clients never read these tables
-- directly: the public page verifies the PIN server-side and reads through
-- the service role, so only owners get RLS policies.

create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  studio_name text,
  pin text not null,
  cover_photo_id uuid,
  created_by uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.gallery_photos (
  id uuid primary key,
  gallery_id uuid not null,
  original_key text not null,
  display_key text not null,
  thumbnail_key text not null,
  file_name text,
  width integer not null,
  height integer not null,
  display_order integer not null default 0,
  original_size bigint not null default 0,
  display_size bigint not null default 0,
  thumbnail_size bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint gallery_photos_gallery_id_fkey
    foreign key (gallery_id) references public.galleries (id) on delete cascade
);

-- Named so PostgREST embeds can disambiguate the two relationships
alter table public.galleries
  add constraint galleries_cover_photo_id_fkey
  foreign key (cover_photo_id) references public.gallery_photos (id)
  on delete set null;

create index gallery_photos_gallery_order_idx
  on public.gallery_photos (gallery_id, display_order, id);
create index galleries_created_by_idx on public.galleries (created_by);

alter table public.galleries enable row level security;
alter table public.gallery_photos enable row level security;

create policy "Owners manage their galleries"
  on public.galleries for all to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "Owners manage their gallery photos"
  on public.gallery_photos for all to authenticated
  using (exists (
    select 1 from public.galleries g
    where g.id = gallery_id and g.created_by = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.galleries g
    where g.id = gallery_id and g.created_by = (select auth.uid())
  ));

-- Storage usage now also counts gallery files (original + display + thumbnail)
create or replace function public.storage_usage()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select coalesce(sum(p.original_size + p.thumbnail_size), 0)
       from public.photos p)
    + (select coalesce(sum(g.original_size + g.display_size + g.thumbnail_size), 0)
       from public.gallery_photos g);
$$;
