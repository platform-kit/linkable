-- Newsletter sends (broadcasts) table
create table if not exists public.newsletter_sends (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  excerpt_html text not null default '',
  body_html text not null default '',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Newsletter click tracking table
create table if not exists public.newsletter_clicks (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references public.newsletter_sends(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  clicked_at timestamptz not null default now()
);

-- Index for fast click counts per send
create index if not exists idx_newsletter_clicks_send_id on public.newsletter_clicks(send_id);

-- Enable Row-Level Security
alter table public.newsletter_sends enable row level security;
alter table public.newsletter_clicks enable row level security;

-- Only authenticated (admin / service role) can manage sends
create policy "Authenticated users can manage sends"
  on public.newsletter_sends
  for all
  to authenticated
  using (true);

-- Service role needs full access (edge functions use service role key)
-- Clicks: allow anonymous inserts (for tracking link clicks)
create policy "Anyone can insert clicks"
  on public.newsletter_clicks
  for insert
  to anon
  with check (true);

create policy "Authenticated users can read clicks"
  on public.newsletter_clicks
  for all
  to authenticated
  using (true);
