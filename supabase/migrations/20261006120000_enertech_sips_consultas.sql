-- SIPS lookup history. Written only by the sips-lookup Edge Function (service role).
-- Used as an audit log, quota control and internal cache (30 days for `listo`, 24 h for `sin_datos`).
-- The raw provider payload (`datos`) is intentionally NOT stored.

create table if not exists public.enertech_sips_consultas (
  id uuid primary key default gen_random_uuid(),
  cups text not null,
  producto text not null default 'luz' check (producto in ('luz', 'gas')),
  estado text not null check (estado in ('listo', 'procesando', 'sin_datos', 'error')),
  resumen jsonb,
  origen text,
  consultado_en timestamptz,
  from_cache boolean not null default false,
  error_code text,
  solicitado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists enertech_sips_consultas_cups_idx
  on public.enertech_sips_consultas (cups, producto, created_at desc);

create index if not exists enertech_sips_consultas_user_idx
  on public.enertech_sips_consultas (solicitado_por, created_at desc);

alter table public.enertech_sips_consultas enable row level security;

drop policy if exists enertech_sips_consultas_select_own on public.enertech_sips_consultas;
create policy enertech_sips_consultas_select_own
  on public.enertech_sips_consultas
  for select
  to authenticated
  using (solicitado_por = auth.uid());

drop policy if exists enertech_sips_consultas_select_superadmin on public.enertech_sips_consultas;
create policy enertech_sips_consultas_select_superadmin
  on public.enertech_sips_consultas
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.role = 'superadmin'
    )
  );

comment on table public.enertech_sips_consultas is
  'Historial de consultas SIPS (Enertech GET /sips). Sin payload crudo. Insert solo vía service role.';
