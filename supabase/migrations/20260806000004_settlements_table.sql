-- ============================================================
-- 4. Tabla settlements — hoy 100% local (useState<Settlement[]>)
-- ============================================================

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid references public.contratos_equipo(id),
  comercial_id text references public.erp_comerciales(id),
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
  execute function private.set_updated_at();

alter table public.settlements enable row level security;

drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );

-- Las liquidaciones normalmente las genera el sistema (activar/dar de baja
-- un contrato), no un usuario a mano. Solo superadmin/tramitación pueden
-- crearlas o editarlas manualmente; el resto son generadas por la app
-- con la service_role key desde una función/Edge Function si se automatiza.
drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (private.current_role() in ('superadmin', 'tramitacion'));

drop policy if exists settlements_update on public.settlements;
create policy settlements_update on public.settlements
  for update to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'))
  with check (private.current_role() in ('superadmin', 'tramitacion'));

drop policy if exists settlements_delete on public.settlements;
create policy settlements_delete on public.settlements
  for delete to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'));
