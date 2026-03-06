-- Enable pg_cron and pg_net extensions for scheduled edge function invocation
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Store the project URL and anon key in Vault so they are not hardcoded
-- These will be populated per-environment; the migration seeds them with
-- placeholder values that must be updated via:
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<anon-key>', 'anon_key');
-- For local dev the defaults below point at the local Supabase instance.

do $$
begin
  -- Only insert if the secret doesn't already exist
  if not exists (select 1 from vault.secrets where name = 'project_url') then
    perform vault.create_secret('http://kong:8000', 'project_url');
  end if;
  if not exists (select 1 from vault.secrets where name = 'anon_key') then
    perform vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      'anon_key'
    );
  end if;
end $$;

-- Schedule newsletter-cron to run every 5 minutes
select cron.schedule(
  'newsletter-cron-job',
  '*/5 * * * *',
  $$
  select net.http_post(
    url    := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
              || '/functions/v1/newsletter-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body   := '{}'::jsonb
  ) as request_id;
  $$
);
