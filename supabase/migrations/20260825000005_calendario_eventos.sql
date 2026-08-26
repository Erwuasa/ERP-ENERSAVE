-- Calendario interno (ERP) — preparación Fase 4
-- Visibilidad jerárquica vía RLS (manager_id en user_profiles)

begin;

create table if not exists public.calendario_eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  tipo text not null default 'evento' check (tipo in ('evento', 'vacaciones', 'ausencia', 'reunion')),
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  todo_el_dia boolean not null default false,
  usuario_id uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now()
);

alter table public.calendario_eventos enable row level security;

drop policy if exists calendario_select on public.calendario_eventos;
create policy calendario_select on public.calendario_eventos
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or usuario_id = private.current_comercial_id()
    or usuario_id in (
      select id from public.user_profiles
      where manager_id = private.current_comercial_id()
    )
  );

drop policy if exists calendario_insert on public.calendario_eventos;
create policy calendario_insert on public.calendario_eventos
  for insert to authenticated
  with check (
    usuario_id = private.current_comercial_id()
    or private.current_role() in ('superadmin', 'tramitacion')
  );

drop policy if exists calendario_update on public.calendario_eventos;
create policy calendario_update on public.calendario_eventos
  for update to authenticated
  using (
    usuario_id = private.current_comercial_id()
    or private.current_role() in ('superadmin', 'tramitacion')
  );

drop policy if exists calendario_delete on public.calendario_eventos;
create policy calendario_delete on public.calendario_eventos
  for delete to authenticated
  using (
    usuario_id = private.current_comercial_id()
    or private.current_role() in ('superadmin', 'tramitacion')
  );

commit;
