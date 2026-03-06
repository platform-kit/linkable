-- Analytics events table
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('pageview', 'click')),
  page text not null default '/',
  referrer text,
  visitor_id text,
  user_agent text,
  country text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_analytics_events_created_at on public.analytics_events (created_at);
create index idx_analytics_events_type_created on public.analytics_events (event_type, created_at);
create index idx_analytics_events_visitor on public.analytics_events (visitor_id, created_at);

-- Enable Row-Level Security
alter table public.analytics_events enable row level security;

-- Allow anonymous inserts (public tracking from the frontend)
create policy "Anyone can insert analytics events"
  on public.analytics_events
  for insert
  to anon
  with check (true);

-- Only authenticated (admin) can read analytics
create policy "Authenticated users can read analytics"
  on public.analytics_events
  for select
  to authenticated
  using (true);
