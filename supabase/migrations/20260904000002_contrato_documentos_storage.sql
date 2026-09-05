-- Bucket privado para documentos legales del expediente de contrato.
-- Convención de path: {contrato_id}/{documento_id}/{filename}

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contrato-documentos',
  'contrato-documentos',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/x-m4a'
  ]::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists contrato_documentos_storage_select on storage.objects;
create policy contrato_documentos_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contrato-documentos'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
  );

drop policy if exists contrato_documentos_storage_insert on storage.objects;
create policy contrato_documentos_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contrato-documentos'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
    and (
      coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
      or exists (
        select 1
        from public.contratos_equipo c
        where c.id = private.contrato_id_from_storage_path(name)
          and c.comercial_id = private.current_comercial_id()
      )
    )
  );

drop policy if exists contrato_documentos_storage_update on storage.objects;
create policy contrato_documentos_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'contrato-documentos'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
  )
  with check (
    bucket_id = 'contrato-documentos'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
  );

drop policy if exists contrato_documentos_storage_delete on storage.objects;
create policy contrato_documentos_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'contrato-documentos'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
    and coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
  );

commit;
