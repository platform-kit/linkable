-- Enable the pgmq extension for durable message queues
create extension if not exists pgmq;

-- Create the newsletter email queue (basic/logged for durability)
select pgmq.create('newsletter_emails');

-- ────────────────────────────────────────────────────────────────────
-- Per-recipient delivery tracking
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references public.newsletter_sends(id) on delete cascade,
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete cascade,
  email text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts integer not null default 0,
  error text,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(send_id, subscriber_id)
);

create index if not exists idx_newsletter_deliveries_send_id on public.newsletter_deliveries(send_id);
create index if not exists idx_newsletter_deliveries_status on public.newsletter_deliveries(send_id, status);

alter table public.newsletter_deliveries enable row level security;

create policy "Authenticated users can manage deliveries"
  on public.newsletter_deliveries
  for all
  to authenticated
  using (true);

-- ────────────────────────────────────────────────────────────────────
-- Public wrapper functions for pgmq (callable from edge functions
-- via supabase.rpc())
-- ────────────────────────────────────────────────────────────────────

-- Enqueue all confirmed subscribers for a given send.
-- Returns the number of subscribers enqueued.
create or replace function public.newsletter_enqueue_send(p_send_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  sub record;
  enqueued integer := 0;
begin
  for sub in
    select s.id, s.email
    from public.newsletter_subscribers s
    where s.confirmed_at is not null
      and s.unsubscribed_at is null
  loop
    insert into public.newsletter_deliveries (send_id, subscriber_id, email, status)
    values (p_send_id, sub.id, sub.email, 'queued')
    on conflict (send_id, subscriber_id) do nothing;

    perform pgmq.send('newsletter_emails', jsonb_build_object(
      'send_id', p_send_id,
      'subscriber_id', sub.id,
      'email', sub.email
    ));

    enqueued := enqueued + 1;
  end loop;

  return enqueued;
end;
$$;

-- Read a batch of messages from the newsletter queue.
create or replace function public.newsletter_queue_read(p_qty integer default 10, p_vt integer default 120)
returns table(msg_id bigint, read_ct bigint, enqueued_at timestamptz, vt timestamptz, message jsonb)
language sql
security definer
as $$
  select msg_id, read_ct, enqueued_at, vt, message
  from pgmq.read('newsletter_emails', p_vt, p_qty);
$$;

-- Delete a processed message from the queue.
create or replace function public.newsletter_queue_delete(p_msg_id bigint)
returns boolean
language sql
security definer
as $$
  select pgmq.delete('newsletter_emails', p_msg_id);
$$;

-- Archive a permanently failed message.
create or replace function public.newsletter_queue_archive(p_msg_id bigint)
returns boolean
language sql
security definer
as $$
  select pgmq.archive('newsletter_emails', p_msg_id);
$$;

-- Finalize a send when all deliveries are resolved.
-- Updates newsletter_sends to 'sent' if no 'queued' deliveries remain.
create or replace function public.newsletter_finalize_send(p_send_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  pending_count integer;
  sent_count integer;
begin
  select count(*) into pending_count
  from public.newsletter_deliveries
  where send_id = p_send_id and status = 'queued';

  if pending_count > 0 then
    return false;
  end if;

  select count(*) into sent_count
  from public.newsletter_deliveries
  where send_id = p_send_id and status = 'sent';

  update public.newsletter_sends
  set status = 'sent',
      sent_at = now(),
      recipient_count = sent_count
  where id = p_send_id
    and status = 'sending';

  return true;
end;
$$;
