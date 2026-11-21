-- Language of the client-facing pages for an event (PIN form, /select,
-- search). The photographer's dashboard stays in Spanish.
-- Existing events keep Spanish. Apply before deploying the code that
-- reads this column.

alter table public.events
  add column language text not null default 'es'
  check (language in ('es', 'en'));
