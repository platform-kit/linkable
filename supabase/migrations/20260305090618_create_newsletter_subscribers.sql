-- Newsletter subscribers table
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  constraint newsletter_subscribers_email_unique unique (email)
);

-- Enable Row-Level Security
alter table public.newsletter_subscribers enable row level security;

-- Allow anonymous inserts (public signup form)
create policy "Anyone can subscribe"
  on public.newsletter_subscribers
  for insert
  to anon
  with check (true);

-- Only authenticated (admin) users can read/update/delete subscribers
create policy "Authenticated users can read subscribers"
  on public.newsletter_subscribers
  for select
  to authenticated
  using (true);

create policy "Authenticated users can update subscribers"
  on public.newsletter_subscribers
  for update
  to authenticated
  using (true);

create policy "Authenticated users can delete subscribers"
  on public.newsletter_subscribers
  for delete
  to authenticated
  using (true);
