-- ============================================================
-- 3. Tabla incidencias — hoy 100% local (useState<Ticket[]>)
--    Refleja el modelo de 5 estados / prioridades ya definido
--    en src/lib/incidencias.ts
-- ============================================================

create table if not exists public.incidencias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  titulo text not null,
  descripcion text,
  estado text not null default 'sin_categorizar'
    check (estado in ('sin_categorizar', 'abierto', 'en_progreso', 'resuelto', 'cerrado')),
  prioridad text check (prioridad in ('critica', 'alta', 'media', 'baja')),
  origen text not null default 'manual'
    check (origen in ('manual', 'comercial', 'sistema', 'cliente')),
  canal text,
  contrato_id uuid references public.contratos_equipo(id),
  cliente_id uuid references public.clientes(id),
  creado_por text references public.erp_comerciales(id),
  asignado_a text references public.erp_comerciales(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_incidencias_estado on public.incidencias (estado);
create index if not exists idx_incidencias_asignado on public.incidencias (asignado_a);
create index if not exists idx_incidencias_creado_por on public.incidencias (creado_por);
create index if not exists idx_incidencias_prioridad on public.incidencias (prioridad);

drop trigger if exists trg_incidencias_updated_at on public.incidencias;
create trigger trg_incidencias_updated_at
  before update on public.incidencias
  for each row
  execute function private.set_updated_at();

-- Secuencia para autogenerar el código tipo "INC-0042"
create sequence if not exists public.incidencias_codigo_seq;

create or replace function private.generate_incidencia_codigo()
returns trigger
language plpgsql
as $$
begin
  if new.codigo is null then
    new.codigo := 'INC-' || lpad(nextval('public.incidencias_codigo_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_incidencias_codigo on public.incidencias;
create trigger trg_incidencias_codigo
  before insert on public.incidencias
  for each row
  execute function private.generate_incidencia_codigo();

alter table public.incidencias enable row level security;

drop policy if exists incidencias_select on public.incidencias;
create policy incidencias_select on public.incidencias
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or creado_por = private.current_comercial_id()
    or asignado_a = private.current_comercial_id()
  );

drop policy if exists incidencias_insert on public.incidencias;
create policy incidencias_insert on public.incidencias
  for insert to authenticated
  with check (
    private.current_role() in ('superadmin', 'tramitacion', 'comercial', 'jefe_comercial')
  );

-- Solo superadmin/tramitación pueden arrastrar/cambiar estado en el Kanban
-- (coherente con canDragIncidencias = isErpOpsAdmin ya documentado)
drop policy if exists incidencias_update on public.incidencias;
create policy incidencias_update on public.incidencias
  for update to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or (creado_por = private.current_comercial_id() and private.current_role() = 'comercial')
  )
  with check (
    private.current_role() in ('superadmin', 'tramitacion')
    or (creado_por = private.current_comercial_id() and private.current_role() = 'comercial')
  );

drop policy if exists incidencias_delete on public.incidencias;
create policy incidencias_delete on public.incidencias
  for delete to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'));
