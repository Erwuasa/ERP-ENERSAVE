-- Lectura de facturas en Storage para staff y para el cliente dueño del lead.

drop policy if exists facturas_select_authenticated on storage.objects;
create policy facturas_select_authenticated
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'facturas'
    and (
      (select private.current_comercial_id()) is not null
      or exists (
        select 1
        from public.leads l
        where l.auth_user_id = auth.uid()
          and name like (l.id::text || '/%')
      )
    )
  );
