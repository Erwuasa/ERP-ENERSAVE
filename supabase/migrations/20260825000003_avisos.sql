-- Avisos internos (ERP) — preparación Fase 4
-- Lectura: todos los autenticados
-- Alta: superadmin y tramitación
-- Update: todos (marcar visto, etc. — UI en Fase 4)

begin;

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contenido text not null,
  tipo text not null default 'info' check (tipo in ('info', 'importante', 'urgente')),
  frecuencia text not null default 'puntual' check (frecuencia in ('diaria', 'semanal', 'puntual')),
  publicado_por uuid references public.user_profiles(id),
  visto_por text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.avisos enable row level security;

drop policy if exists avisos_select on public.avisos;
create policy avisos_select on public.avisos
  for select to authenticated
  using (true);

drop policy if exists avisos_insert on public.avisos;
create policy avisos_insert on public.avisos
  for insert to authenticated
  with check (private.current_role() in ('superadmin', 'tramitacion'));

drop policy if exists avisos_update on public.avisos;
create policy avisos_update on public.avisos
  for update to authenticated
  using (true);

commit;
