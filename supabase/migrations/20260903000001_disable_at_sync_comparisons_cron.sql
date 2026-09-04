-- Pause AT comparisons cron until catalog/webhook auth is stable.
-- Re-enable later with:
--   select cron.schedule(
--     'at-sync-comparisons',
--     '20 * * * *',
--     $$select private.invoke_at_sync('sync-comparisons-at')$$
--   );

do $$
declare
  jid bigint;
begin
  for jid in
    select jobid from cron.job where jobname = 'at-sync-comparisons'
  loop
    perform cron.unschedule(jid);
  end loop;
end $$;
