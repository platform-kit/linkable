-- Add cover_image column to newsletter_sends for banner/cover images.
alter table newsletter_sends
  add column if not exists cover_image text not null default '';
