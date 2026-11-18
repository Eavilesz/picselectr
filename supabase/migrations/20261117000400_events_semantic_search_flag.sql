-- Semantic search, step 4: per-event opt-in, set by the studio in the
-- new/edit event forms. Off by default so existing events are unchanged
-- and nothing is indexed (or billed) unless the studio turns it on.
alter table public.events
  add column if not exists semantic_search_enabled boolean not null default false;
