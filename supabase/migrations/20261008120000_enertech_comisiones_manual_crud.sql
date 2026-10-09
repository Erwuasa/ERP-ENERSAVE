-- Marco Retributivo CRUD: allow superadmin/tramitacion to create/edit/delete entries directly on
-- enertech_comisiones (the live table), while guaranteeing the next Enertech sync always wins.
--
-- `source` marks where a row came from:
--   'api'    (default) -- written only by the enertech-sync-comisiones Edge Function
--   'manual' -- written only by ERP staff through the app
--
-- The sync engine (_shared/enertech-sync-engine.ts, `manualSourceColumn: 'source'`) excludes
-- `source = 'manual'` rows from its "missing from feed" removal pass, so a manual create survives
-- indefinitely. A manual EDIT of an existing API row does NOT change its `source` (UPDATE policy
-- below only touches payload/company_id/removed_at, never `source` itself via the app), so the
-- next sync still recognizes it as an API row and overwrites it with the live feed value, exactly
-- as the owner asked: "que no haya problemas por crud en la tabla siempre que prevalezca los datos
-- de API". A manual DELETE (soft: removed_at) of an API row is likewise overwritten/restored by
-- the next sync if the row is still present in the feed, because upsert-by-clave always clears
-- removed_at on a matching incoming row.

alter table public.enertech_comisiones
  add column if not exists source text not null default 'api';

alter table public.enertech_comisiones
  add constraint enertech_comisiones_source_check check (source in ('api', 'manual'));

create index if not exists enertech_comisiones_source_idx on public.enertech_comisiones (source);

drop policy if exists enertech_comisiones_write_manager on public.enertech_comisiones;

create policy enertech_comisiones_insert_manager
  on public.enertech_comisiones
  for insert
  to authenticated
  with check (private.is_marco_retributivo_manager() and source = 'manual');

create policy enertech_comisiones_update_manager
  on public.enertech_comisiones
  for update
  to authenticated
  using (private.is_marco_retributivo_manager())
  with check (private.is_marco_retributivo_manager());

create policy enertech_comisiones_delete_manager
  on public.enertech_comisiones
  for delete
  to authenticated
  using (private.is_marco_retributivo_manager() and source = 'manual');

comment on column public.enertech_comisiones.source is
  'api = written by enertech-sync-comisiones (default); manual = created by ERP staff (superadmin/tramitacion) via Marco Retributivo. Manual rows are skipped by the sync removal pass but an API row with the same clave still overwrites a manual edit/delete on the next sync.';
