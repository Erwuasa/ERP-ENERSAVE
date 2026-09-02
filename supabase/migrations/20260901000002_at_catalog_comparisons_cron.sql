-- Cron AT para catálogos y comparativas (no hay eventos webhook en AT).
-- Auth: vault secret `at-sync-webhook-secret` = el mismo Bearer que usan los
-- webhooks (AT_TARIFFS_SYNC_SECRET). Crearlo UNA vez en SQL Editor:
--   select vault.create_secret('<secret>', 'at-sync-webhook-secret', 'Bearer para cron sync-catalog/comparisons');

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
  if p_function not in ('sync-catalog-at', 'sync-comparisons-at') then
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
  for jid in
    select jobid from cron.job where jobname in ('at-sync-catalog', 'at-sync-comparisons')
  loop
    perform cron.unschedule(jid);
  end loop;
end $$;

-- Catálogos: poco volátiles (enums, comercializadoras, regulatoria).
select cron.schedule(
  'at-sync-catalog',
  '0 */6 * * *',
  $$select private.invoke_at_sync('sync-catalog-at')$$
);

-- Comparativas: altas durante el día laboral; desfase :20 para no coincidir con catálogo.
select cron.schedule(
  'at-sync-comparisons',
  '20 * * * *',
  $$select private.invoke_at_sync('sync-comparisons-at')$$
);
