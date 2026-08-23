-- ============================================================
-- FTP — Documentos operativos compartidos (ERP EnerSave)
-- Ejecutar en Supabase SQL Editor (proyecto remoto).
--
-- Requisitos previos (migraciones ya aplicadas en el proyecto):
--   • public.erp_comerciales
--   • private.current_role()  (RLS ventas / contratos)
--   • private.set_updated_at() (opcional; se crea abajo si falta)
-- ============================================================

create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tabla principal: carpetas y ficheros del explorador FTP
create table if not exists public.ftp_nodes (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.ftp_nodes(id) on delete cascade,
  name text not null,
  node_type text not null check (node_type in ('folder', 'file')),
  storage_path text,
  mime_type text,
  size_bytes bigint,
  created_by text references public.erp_comerciales(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ftp_nodes_parent on public.ftp_nodes (parent_id);
create index if not exists idx_ftp_nodes_type on public.ftp_nodes (node_type);

drop trigger if exists trg_ftp_nodes_updated_at on public.ftp_nodes;
create trigger trg_ftp_nodes_updated_at
  before update on public.ftp_nodes
  for each row
  execute function private.set_updated_at();

alter table public.ftp_nodes enable row level security;

drop policy if exists ftp_nodes_select on public.ftp_nodes;
create policy ftp_nodes_select on public.ftp_nodes
  for select
  to authenticated
  using (true);

drop policy if exists ftp_nodes_insert on public.ftp_nodes;
create policy ftp_nodes_insert on public.ftp_nodes
  for insert
  to authenticated
  with check (private.current_role() in ('superadmin', 'tramitacion'));

drop policy if exists ftp_nodes_update on public.ftp_nodes;
create policy ftp_nodes_update on public.ftp_nodes
  for update
  to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'))
  with check (private.current_role() in ('superadmin', 'tramitacion'));

drop policy if exists ftp_nodes_delete on public.ftp_nodes;
create policy ftp_nodes_delete on public.ftp_nodes
  for delete
  to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'));

-- Bucket de almacenamiento (lectura vía signed URLs)
insert into storage.buckets (id, name, public)
values ('ftp-documentos', 'ftp-documentos', false)
on conflict (id) do nothing;

drop policy if exists ftp_storage_select on storage.objects;
create policy ftp_storage_select on storage.objects
  for select
  to authenticated
  using (bucket_id = 'ftp-documentos');

drop policy if exists ftp_storage_insert on storage.objects;
create policy ftp_storage_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'ftp-documentos'
    and private.current_role() in ('superadmin', 'tramitacion')
  );

drop policy if exists ftp_storage_delete on storage.objects;
create policy ftp_storage_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'ftp-documentos'
    and private.current_role() in ('superadmin', 'tramitacion')
  );

-- Seed inicial: DOCUMENTOS OPERACIONES + carpetas comercializadoras
do $$
declare
  v_ops_id uuid;
begin
  if not exists (
    select 1 from public.ftp_nodes where name = 'DOCUMENTOS OPERACIONES' and parent_id is null
  ) then
    insert into public.ftp_nodes (name, node_type)
    values ('DOCUMENTOS OPERACIONES', 'folder')
    returning id into v_ops_id;

    insert into public.ftp_nodes (parent_id, name, node_type)
    values
      (v_ops_id, 'ALARMAS', 'folder'),
      (v_ops_id, 'AXPO', 'folder'),
      (v_ops_id, 'CHC', 'folder'),
      (v_ops_id, 'ENDESA_-GAS_-CDADES', 'folder'),
      (v_ops_id, 'ENDESA_CDAD_PROPIETARIOS_POR_PYME', 'folder'),
      (v_ops_id, 'ENDESA_PYME_POR_CONSUMO', 'folder'),
      (v_ops_id, 'ENDESA_REC_EXPRESS', 'folder'),
      (v_ops_id, 'ENDESA_RESIDENCIAL', 'folder'),
      (v_ops_id, 'FACTOR-ENERGIA', 'folder'),
      (v_ops_id, 'GANA', 'folder'),
      (v_ops_id, 'IBERDROLA_RESIDENCIAL_ATENTE', 'folder'),
      (v_ops_id, 'IGNIS', 'folder'),
      (v_ops_id, 'NATURGY_PYMES_ATENTE', 'folder'),
      (v_ops_id, 'NATURGY_RESIDENCIAL_ATENTE', 'folder'),
      (v_ops_id, 'NIBA', 'folder'),
      (v_ops_id, 'NORDY', 'folder'),
      (v_ops_id, 'OCTOPUS_ENERGY', 'folder'),
      (v_ops_id, 'PROSOL', 'folder'),
      (v_ops_id, 'REPSOL', 'folder'),
      (v_ops_id, 'TELEFONIA', 'folder');
  end if;
end $$;
