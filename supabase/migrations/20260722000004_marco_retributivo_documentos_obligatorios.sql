alter table public.marco_retributivo
  add column if not exists documentos_obligatorios text[] default array['cif_nif', 'dni_nie'];
