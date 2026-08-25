-- ============================================================
-- 2. Tabla clientes — hoy 100% local, no existe en Supabase
-- ============================================================

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo_cliente text not null check (tipo_cliente in ('particular', 'empresa')),
  nif_cif text,
  telefono text,
  email text,
  direccion text,
  codigo_postal text,
  localidad text,
  provincia text,
  estado text not null default 'pendiente' check (estado in ('activo', 'pendiente', 'inactivo')),
  es_moroso boolean not null default false,
  comercial_id text references public.erp_comerciales(id),
  archivos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_clientes_nif_cif on public.clientes (nif_cif) where nif_cif is not null;
create index if not exists idx_clientes_nombre on public.clientes (lower(nombre));
create index if not exists idx_clientes_comercial on public.clientes (comercial_id);
create index if not exists idx_clientes_tipo on public.clientes (tipo_cliente);

drop trigger if exists trg_clientes_updated_at on public.clientes;
create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row
  execute function private.set_updated_at();

alter table public.clientes enable row level security;

drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );

drop policy if exists clientes_insert on public.clientes;
create policy clientes_insert on public.clientes
  for insert to authenticated
  with check (true);

drop policy if exists clientes_update on public.clientes;
create policy clientes_update on public.clientes
  for update to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  )
  with check (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );

-- Solo superadmin/tramitación pueden marcar/desmarcar cliente moroso
-- (ya cubierto por la policy de update de arriba, que exige uno de esos
-- roles o ser el comercial dueño; si quieres restringir es_moroso SOLO
-- a superadmin/tramitación incluso para el propio comercial, dímelo y
-- lo separamos en una policy de columna con una función adicional).

drop policy if exists clientes_delete on public.clientes;
create policy clientes_delete on public.clientes
  for delete to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'));
