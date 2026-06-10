create table if not exists public.processed_stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;
-- No policies: only the service-role key (webhook) may read/write, which bypasses RLS.
