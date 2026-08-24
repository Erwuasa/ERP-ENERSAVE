-- Documentos obligatorios por tarifa en marco retributivo
-- Requiere: 20260722000001_marco_retributivo_table.sql

begin;

do $$
begin
  if to_regclass('public.marco_retributivo') is null then
    raise exception 'Falta public.marco_retributivo. Ejecuta primero 20260722000001_marco_retributivo_table.sql';
  end if;
end $$;

alter table public.marco_retributivo
  add column if not exists documentos_obligatorios text[] default array['cif_nif', 'dni_nie'];

commit;
