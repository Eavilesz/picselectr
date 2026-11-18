-- Semantic search, step 3: nearest photos to a query embedding, ALWAYS
-- scoped to one event and one model.
--
-- * The event filter is in the function body, not left to the caller, so it
--   can never return another event's photos (a null slug matches nothing).
-- * Results below min_similarity are dropped, so an unrelated query returns
--   nothing instead of the "least bad" photos. The default is provisional:
--   tune it with scripts/eval-search.mjs.
-- * Only the service role can execute it. The search endpoint authorizes
--   the caller (event owner or valid PIN cookie) before calling.
-- * Exact search: the materialized CTE narrows to the event's rows first
--   (btree on event_slug, model), then sorts them by distance. An event has
--   at most a few thousand photos, so this is fast and has perfect recall.
--   Letting HNSW drive a filtered query can silently return fewer rows than
--   exist, and its iterative-scan setting can't be set per function on
--   Supabase (permission denied for non-superusers).

create or replace function public.search_photos(
  p_event_slug text,
  query_embedding extensions.vector(768),
  match_limit integer,
  p_model text,
  min_similarity double precision default 0.2
)
returns table (photo_id uuid, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  with candidates as materialized (
    select pe.photo_id, pe.embedding
    from public.photo_embeddings pe
    where pe.event_slug = p_event_slug
      and pe.model = p_model
  ),
  scored as (
    select
      c.photo_id,
      1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
    from candidates c
  )
  select s.photo_id, s.similarity
  from scored s
  where s.similarity >= min_similarity
  order by s.similarity desc
  limit least(greatest(coalesce(match_limit, 20), 1), 100);
$$;

revoke execute on function public.search_photos(
  text, extensions.vector, integer, text, double precision
) from public, anon, authenticated;
grant execute on function public.search_photos(
  text, extensions.vector, integer, text, double precision
) to service_role;
