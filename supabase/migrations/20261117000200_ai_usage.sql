-- Semantic search, step 2: one row per paid AI call, to measure cost per
-- event. `operation` separates indexing (one-off per photo) from search
-- queries (ongoing, also used for the per-event daily query cap).
--
-- event_slug is "on delete set null" so deleting an event keeps its cost
-- history in the totals (those rows are then only visible to the service
-- role).

create table public.ai_usage (
  id bigint generated always as identity primary key,
  event_slug text
    references public.events (slug) on delete set null on update cascade,
  operation text not null check (operation in ('index', 'query')),
  tokens integer not null default 0,
  -- null when the provider didn't report a cost
  cost_usd numeric,
  model text not null,
  created_at timestamptz not null default now()
);

create index ai_usage_event_op_created_idx
  on public.ai_usage (event_slug, operation, created_at);

alter table public.ai_usage enable row level security;

-- Owners can read their events' usage. Inserts go through the service role.
create policy "Owners read their event AI usage"
  on public.ai_usage for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.slug = event_slug and e.created_by = (select auth.uid())
  ));
