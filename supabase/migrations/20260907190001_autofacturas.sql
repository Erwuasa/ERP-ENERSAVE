-- Registro de autofacturas emitidas por comerciales (documento fiscal, sin cambio de estado en settlements)

begin;

create table if not exists public.autofacturas (
  id uuid primary key default gen_random_uuid(),
  comercial_id uuid not null references public.user_profiles(id),
  comercial_name text not null default '',
  periodo_mes int not null check (periodo_mes between 1 and 12),
  periodo_anio int not null check (periodo_anio >= 2000),
  settlement_ids uuid[] not null default '{}'::uuid[],
  total_comisionado numeric not null default 0,
  generated_at timestamptz not null default now()
);

create index if not exists autofacturas_comercial_idx on public.autofacturas (comercial_id);
create index if not exists autofacturas_periodo_idx on public.autofacturas (periodo_anio, periodo_mes);
create index if not exists autofacturas_generated_at_idx on public.autofacturas (generated_at desc);

alter table public.autofacturas enable row level security;

drop policy if exists autofacturas_select on public.autofacturas;
create policy autofacturas_select on public.autofacturas
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );

drop policy if exists autofacturas_insert on public.autofacturas;
create policy autofacturas_insert on public.autofacturas
  for insert to authenticated
  with check (
    comercial_id = private.current_comercial_id()
    or private.current_role() in ('superadmin', 'tramitacion')
  );

commit;
