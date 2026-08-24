-- ============================================================
-- 1. Completar contratos_equipo: columnas que el tipo Contract
--    real usa pero que la tabla actual no tiene, y habilitar
--    SELECT/UPDATE/DELETE (hoy solo permite INSERT)
-- ============================================================

alter table public.contratos_equipo
  add column if not exists id uuid primary key default gen_random_uuid(),
  add column if not exists estado_efectivo_desde date,
  add column if not exists motivo_cambio_estado text,
  add column if not exists fecha_baja date,
  add column if not exists retrocomision_clawback numeric(10,2),
  add column if not exists estado_renovacion text,
  add column if not exists fecha_renovacion date,
  add column if not exists dias_renovacion integer,
  add column if not exists cliente_moroso boolean not null default false,
  add column if not exists consumo_anual_manual numeric(12,2),
  add column if not exists potencia_contratada_kw numeric(6,2),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.user_profiles(id);

-- Índices útiles para los filtros que ya tiene ContratosPanel.tsx
create index if not exists idx_contratos_equipo_estado on public.contratos_equipo (estado);
create index if not exists idx_contratos_equipo_compania on public.contratos_equipo (compania);
create index if not exists idx_contratos_equipo_comercial on public.contratos_equipo (comercial_id);
create index if not exists idx_contratos_equipo_cups on public.contratos_equipo (cups);
create index if not exists idx_contratos_equipo_created_at on public.contratos_equipo (created_at desc);

-- Trigger para mantener updated_at al día en cada UPDATE
create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contratos_equipo_updated_at on public.contratos_equipo;
create trigger trg_contratos_equipo_updated_at
  before update on public.contratos_equipo
  for each row
  execute function private.set_updated_at();

-- RLS: hoy probablemente solo tiene policy de INSERT.
-- Añadimos SELECT/UPDATE/DELETE reutilizando el mismo patrón
-- de permisos que ya usa marco_retributivo (private.current_role()).
alter table public.contratos_equipo enable row level security;

drop policy if exists contratos_equipo_select on public.contratos_equipo;
create policy contratos_equipo_select on public.contratos_equipo
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
    or jefe_equipo = private.current_comercial_id()
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
