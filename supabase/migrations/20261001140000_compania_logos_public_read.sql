-- Logos de comercializadoras: lectura pública estable (sin signed URL con caducidad).
-- El ERP usa /storage/v1/object/public/Website/Material/...

update storage.buckets
set public = true
where id = 'Website';

drop policy if exists website_material_logos_public_read on storage.objects;

create policy website_material_logos_public_read
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'Website'
  and (
    name ilike 'Material/%logo%'
    or name ilike 'Material/%Logo%'
  )
);
