-- El catálogo auxiliar de AT no lo usa el ERP. Se queda el cron de comparativas.

create or replace function private.invoke_at_sync(p_function text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  req_id bigint;
  secret text;
begin
  if p_function <> 'sync-comparisons-at' then
    raise exception 'invalid at sync function: %', p_function;
  end if;

  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'at-sync-webhook-secret'
  limit 1;

  if secret is null or btrim(secret) = '' then
    raise exception 'Falta vault secret at-sync-webhook-secret';
  end if;

  select net.http_post(
    url := 'https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1/'
      || p_function
      || '?mode=sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := jsonb_build_object('mode', 'sync'),
    timeout_milliseconds := 60000
  )
  into req_id;

  return req_id;
end;
$$;

revoke all on function private.invoke_at_sync(text) from public;
grant execute on function private.invoke_at_sync(text) to postgres;

do $$
declare
  jid bigint;
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    for jid in
      select jobid from cron.job where jobname = 'at-sync-catalog'
    loop
      perform cron.unschedule(jid);
    end loop;
  end if;
end $$;

drop table if exists public.at_catalog_entries;
