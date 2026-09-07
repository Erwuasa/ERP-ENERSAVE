-- Tipos de comunicación sector energía, borrado por autor y logs email solo superadmin.

begin;

-- Migrar tipos legacy → nuevos
update public.avisos set tipo = 'general' where tipo = 'info';
update public.avisos set tipo = 'comercial' where tipo = 'importante';

alter table public.avisos drop constraint if exists avisos_tipo_check;
alter table public.avisos
  add constraint avisos_tipo_check
  check (tipo in ('general', 'comercial', 'tramitacion', 'liquidaciones', 'urgente'));

drop policy if exists avisos_delete on public.avisos;
create policy avisos_delete on public.avisos
  for delete to authenticated
  using (publicado_por = auth.uid());

drop policy if exists at_email_logs_select on public.at_email_logs;
create policy at_email_logs_select on public.at_email_logs
  for select to authenticated
  using (coalesce((select private.current_role()), '') = 'superadmin');

commit;
