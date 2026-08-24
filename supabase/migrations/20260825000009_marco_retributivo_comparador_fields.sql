-- Campos comparador: tipo_precio, incluye_sva, potencia_boe
-- Requiere: 20260722000001_marco_retributivo_table.sql (y 00002/00004/280002 recomendados)

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.marco_retributivo') is null then
    raise exception 'Falta public.marco_retributivo. Ejecuta primero 20260722000001_marco_retributivo_table.sql';
  end if;
end $$;

alter table public.marco_retributivo
  add column if not exists tipo_precio text,
  add column if not exists incluye_sva boolean not null default false,
  add column if not exists potencia_boe boolean not null default false;

alter table public.marco_retributivo drop constraint if exists marco_retributivo_tipo_precio_check;
alter table public.marco_retributivo
  add constraint marco_retributivo_tipo_precio_check
  check (tipo_precio is null or tipo_precio in ('fijo', 'indexado'));

comment on column public.marco_retributivo.tipo_precio is
  'Tipo de precio energía: fijo o indexado (pool/mercado).';
comment on column public.marco_retributivo.incluye_sva is
  'True si la tarifa incluye SVA obligatorio empaquetado.';
comment on column public.marco_retributivo.potencia_boe is
  'True si el término de potencia sigue precio regulado BOE.';

update public.marco_retributivo
set tipo_precio = 'indexado'
where tipo_precio is null
  and (
    tarifa ilike '%index%'
    or tarifa ilike '%pool%'
    or tarifa ilike '%variable%'
    or tarifa ilike '%dinám%'
    or tarifa ilike '%omie%'
    or condiciones ilike '%index%'
    or condiciones ilike '%pool%'
  );

update public.marco_retributivo
set tipo_precio = 'fijo'
where tipo_precio is null
  and (
    tarifa ilike '%fij%'
    or tarifa ilike '%estable%'
    or tarifa ilike '%cerrad%'
    or condiciones ilike '%precio%cerrad%'
  );

update public.marco_retributivo
set tipo_precio = coalesce(tipo_precio, 'fijo')
where tipo = 'luz';

update public.marco_retributivo
set incluye_sva = true
where condiciones ilike '%sva%'
   or condiciones ilike '%valor añadido%'
   or condiciones ilike '%servicio%obligatorio%'
   or tarifa ilike '%solar%battery%';

update public.marco_retributivo
set potencia_boe = true
where condiciones ilike '%boe%'
   or condiciones ilike '%regulad%'
   or tarifa ilike '%boe%';

commit;
