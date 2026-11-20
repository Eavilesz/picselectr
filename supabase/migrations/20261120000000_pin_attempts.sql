-- Failed PIN attempts, so the server can stop brute-force guessing of the
-- 4-digit PINs on /select and /gallery (10,000 combinations). The forms
-- also count attempts in the browser, but a reload resets that.
--
-- Only failures are stored. ip_hash is an HMAC of the visitor's IP (never
-- the IP itself). Rows older than a day are useless and get pruned by the
-- app as it writes new ones.
--
-- No RLS policies: only the service role (server code) reads or writes.

create table public.pin_attempts (
  id bigint generated always as identity primary key,
  scope text not null check (scope in ('event', 'gallery')),
  target text not null, -- event or gallery slug
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index pin_attempts_target_idx
  on public.pin_attempts (scope, target, created_at);

alter table public.pin_attempts enable row level security;
