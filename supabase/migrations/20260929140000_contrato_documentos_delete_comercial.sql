-- Comercial / jefe pueden eliminar documentos de contratos a los que tienen acceso.

begin;

drop policy if exists contrato_documentos_storage_delete on storage.objects;
create policy contrato_documentos_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'contrato-documentos'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
    and (
      coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
      or exists (
        select 1
        from public.contratos_equipo c
        where c.id = private.contrato_id_from_storage_path(name)
          and (
            c.comercial_id = private.current_comercial_id()
            or c.jefe_equipo = private.current_comercial_id()
          )
      )
    )
  );

commit;
