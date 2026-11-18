-- Semantic search, step 1: one embedding per (photo, model).
--
-- Vectors from different models live in different spaces and must never be
-- compared, so `model` is part of the key and every query filters on it.
-- vector(768) fixes the dimension: a future model with another size needs
-- its own column or table.

create extension if not exists vector with schema extensions;

-- Target for the composite FK below. id is already the PK, so this can't
-- conflict with existing rows.
alter table public.photos
  add constraint photos_id_event_slug_key unique (id, event_slug);

create table public.photo_embeddings (
  photo_id uuid not null,
  event_slug text not null,
  embedding extensions.vector(768) not null,
  model text not null,
  created_at timestamptz not null default now(),
  primary key (photo_id, model),
  -- Composite FK: an embedding can only carry the event_slug of its own
  -- photo, so search filtered by event_slug can't surface another event's
  -- photo. Deleting the photo (or its event) removes the embedding.
  constraint photo_embeddings_photo_fkey
    foreign key (photo_id, event_slug)
    references public.photos (id, event_slug)
    on delete cascade on update cascade
);

-- Per-event lookups (search filter, "what's left to index")
create index photo_embeddings_event_model_idx
  on public.photo_embeddings (event_slug, model);

-- ANN index. Searches are always scoped to one event, which is usually small
-- enough that the planner uses the btree above and scans exactly;
-- search_photos() enables iterative scans so HNSW can't under-return when
-- it is chosen.
create index photo_embeddings_embedding_hnsw_idx
  on public.photo_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.photo_embeddings enable row level security;

-- Owners can read their events' embeddings. No write policies: rows are
-- written only by the indexing job through the service role.
create policy "Owners read their event embeddings"
  on public.photo_embeddings for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.slug = event_slug and e.created_by = (select auth.uid())
  ));
