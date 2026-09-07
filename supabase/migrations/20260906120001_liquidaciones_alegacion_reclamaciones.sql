-- Ajuste manual de comisión en alegaciones + reclamaciones de liquidación por comerciales

begin;

alter table public.alegaciones
  add column if not exists comision_ajustada numeric(10, 2);

comment on column public.alegaciones.comision_ajustada is
  'Importe acordado por superadmin; sustituye la comisión en KPIs cuando está definido.';

create table if not exists public.settlement_reclamaciones (
  settlement_id uuid primary key references public.settlements(id) on delete cascade,
  comercial_id uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now()
);

alter table public.settlement_reclamaciones enable row level security;

drop policy if exists settlement_reclamaciones_select on public.settlement_reclamaciones;
create policy settlement_reclamaciones_select on public.settlement_reclamaciones
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );

drop policy if exists settlement_reclamaciones_insert on public.settlement_reclamaciones;
create policy settlement_reclamaciones_insert on public.settlement_reclamaciones
  for insert to authenticated
  with check (comercial_id = private.current_comercial_id());

drop policy if exists settlement_reclamaciones_delete on public.settlement_reclamaciones;
create policy settlement_reclamaciones_delete on public.settlement_reclamaciones
  for delete to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );

commit;
