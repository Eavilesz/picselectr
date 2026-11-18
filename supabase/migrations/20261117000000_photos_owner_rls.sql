-- Scope photos to the studio that owns the event. Before this, any signed-in
-- user could read/modify every studio's photo rows ("using (true)") and the
-- anon role could list all of them.
--
-- The public /select page and its OG image now read photos through the
-- service role (lib/r2.ts), so they no longer need the anon policy.
-- DEPLOY THE APP CODE BEFORE APPLYING THIS MIGRATION, otherwise clients on
-- /select see an empty gallery until the deploy lands.
--
-- FK cascades (deleting an event) are not subject to RLS, and
-- storage_usage() is security definer, so both are unaffected.

drop policy if exists "Authenticated users can manage photos" on public.photos;
drop policy if exists "Public can read photos" on public.photos;

alter table public.photos enable row level security;

create policy "Owners manage their event photos"
  on public.photos for all to authenticated
  using (exists (
    select 1 from public.events e
    where e.slug = event_slug and e.created_by = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.events e
    where e.slug = event_slug and e.created_by = (select auth.uid())
  ));
