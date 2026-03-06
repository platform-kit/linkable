-- Add tags column to newsletter_sends for frontend filtering.
alter table newsletter_sends
  add column if not exists tags text[] not null default '{}';
