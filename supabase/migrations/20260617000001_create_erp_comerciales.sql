-- Bridge table: simulated App profile IDs (usr-*) → hierarchy for RLS until Supabase Auth ships
-- DATA-01: aligns with src/App.tsx profile seeds

create table if not exists public.erp_comerciales (
  id text primary key,
  full_name text not null,
  role text not null check (role in ('superadmin', 'jefe_comercial', 'comercial')),
  manager_id text references public.erp_comerciales (id) on delete set null,
  auth_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists erp_comerciales_manager_id_idx on public.erp_comerciales (manager_id);
create index if not exists erp_comerciales_role_idx on public.erp_comerciales (role);

comment on table public.erp_comerciales is 'Commercial hierarchy bridge for ventas RLS (text ids until Auth)';

insert into public.erp_comerciales (id, full_name, role, manager_id)
values
  ('usr-1', 'Carlos De la Fuente', 'superadmin', null),
  ('usr-2', 'Elena Garrido', 'jefe_comercial', 'usr-1'),
  ('usr-3', 'Ignacio Ortiz', 'comercial', 'usr-2'),
  ('usr-4', 'Marta Rivas', 'comercial', 'usr-2'),
  ('usr-5', 'Santiago Cano', 'comercial', null)
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  manager_id = excluded.manager_id;
