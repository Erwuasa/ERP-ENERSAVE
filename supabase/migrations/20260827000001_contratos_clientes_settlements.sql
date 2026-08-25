-- Tablas CRM del ERP en el proyecto con user_profiles (EnerSave).
-- Idempotente: create if not exists + policies recreadas.

create table if not exists public.contratos_equipo (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_name text not null,
  cups text not null,
  tipo text not null check (tipo in ('luz', 'gas')),
  compania text not null,
  tarifa text not null,
  tipo_precio text,
  consumo_anual numeric not null default 0,
  estado text not null default 'Pendiente de firma',
  comercial_id uuid not null references public.user_profiles(id),
  comercial_name text not null,
  nif text,
  telefono text,
  email text,
  iban text,
  direccion_suministro text,
  direccion_fiscal text,
  codigo_postal text,
  poblacion text,
  provincia text,
  potencia_contratada text,
  precio_fijo_consumo numeric,
  fecha_inicio date,
  tipo_cliente text,
  forma_pago text,
  nombre_comercial text,
  jefe_equipo uuid references public.user_profiles(id),
  wizard_segment text,
  marco_entry_id text,
  monto_interno numeric not null default 0,
  monto_externo numeric not null default 0,
  comentarios_internos jsonb default '[]'::jsonb,
  documentos jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  estado_efectivo_desde date,
  motivo_cambio_estado text,
  fecha_baja date,
  retrocomision_clawback numeric(10,2),
  estado_renovacion text,
  fecha_renovacion date,
  dias_renovacion integer,
  cliente_moroso boolean not null default false,
  consumo_anual_manual numeric(12,2),
  potencia_contratada_kw numeric(6,2),
  updated_by uuid references public.user_profiles(id)
);

create index if not exists idx_contratos_equipo_estado on public.contratos_equipo (estado);
create index if not exists idx_contratos_equipo_compania on public.contratos_equipo (compania);
create index if not exists idx_contratos_equipo_comercial on public.contratos_equipo (comercial_id);
create index if not exists idx_contratos_equipo_cups on public.contratos_equipo (cups);
create index if not exists idx_contratos_equipo_created_at on public.contratos_equipo (created_at desc);

drop trigger if exists trg_contratos_equipo_updated_at on public.contratos_equipo;
create trigger trg_contratos_equipo_updated_at
  before update on public.contratos_equipo
  for each row
  execute function public.set_updated_at();

alter table public.contratos_equipo enable row level security;
alter table public.contratos_equipo replica identity full;

drop policy if exists contratos_equipo_select on public.contratos_equipo;
create policy contratos_equipo_select on public.contratos_equipo
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
    or jefe_equipo = private.current_comercial_id()
  );

drop policy if exists contratos_equipo_insert on public.contratos_equipo;
create policy contratos_equipo_insert on public.contratos_equipo
  for insert to authenticated
  with check (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );

drop policy if exists contratos_equipo_update on public.contratos_equipo;
create policy contratos_equipo_update on public.contratos_equipo
  for update to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  )
  with check (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );

drop policy if exists contratos_equipo_delete on public.contratos_equipo;
create policy contratos_equipo_delete on public.contratos_equipo
  for delete to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'));

do $$
begin
  alter publication supabase_realtime add table public.contratos_equipo;
exception
  when duplicate_object then null;
end $$;

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
  comercial_id uuid references public.user_profiles(id),
  archivos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_clientes_nif_cif_comercial
  on public.clientes (nif_cif, comercial_id)
  where nif_cif is not null;
create index if not exists idx_clientes_nombre on public.clientes (lower(nombre));
create index if not exists idx_clientes_comercial on public.clientes (comercial_id);

drop trigger if exists trg_clientes_updated_at on public.clientes;
create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row
  execute function public.set_updated_at();

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

drop policy if exists clientes_delete on public.clientes;
create policy clientes_delete on public.clientes
  for delete to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'));

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid references public.contratos_equipo(id),
  comercial_id uuid references public.user_profiles(id),
  comercial_name text,
  tipo text check (tipo in ('luz', 'gas')),
  monto_interno numeric(10,2) not null default 0,
  monto_externo numeric(10,2) not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  descripcion text,
  es_retrocomision boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_settlements_comercial on public.settlements (comercial_id);
create index if not exists idx_settlements_contrato on public.settlements (contrato_id);
create index if not exists idx_settlements_estado on public.settlements (estado);
create index if not exists idx_settlements_retrocomision on public.settlements (es_retrocomision);

drop trigger if exists trg_settlements_updated_at on public.settlements;
create trigger trg_settlements_updated_at
  before update on public.settlements
  for each row
  execute function public.set_updated_at();

alter table public.settlements enable row level security;

drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id in (select private.accessible_comercial_ids())
  );

drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (
    private.current_role() in ('superadmin', 'tramitacion')
    or (
      comercial_id in (select private.accessible_comercial_ids())
      and estado = 'pendiente'
      and es_retrocomision = false
    )
  );

drop policy if exists settlements_update on public.settlements;
create policy settlements_update on public.settlements
  for update to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'))
  with check (private.current_role() in ('superadmin', 'tramitacion'));

drop policy if exists settlements_delete on public.settlements;
create policy settlements_delete on public.settlements
  for delete to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'));

grant select, insert, update, delete on public.contratos_equipo to anon, authenticated, service_role;
grant select, insert, update, delete on public.clientes to anon, authenticated, service_role;
grant select, insert, update, delete on public.settlements to anon, authenticated, service_role;

notify pgrst, 'reload schema';
