-- Asegura tabla erp_comerciales y columna commission_percentage (tipo comisionado %)
-- Idempotente: seguro re-ejecutar en Supabase remoto

begin;

create table if not exists public.erp_comerciales (
  id text primary key,
  full_name text not null,
  role text not null check (role in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion')),
  manager_id text references public.erp_comerciales (id) on delete set null,
  auth_user_id uuid,
  email text,
  commission_percentage numeric(5, 2) not null default 70,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.erp_comerciales add column if not exists email text;

alter table public.erp_comerciales
  add column if not exists commission_percentage numeric(5, 2) not null default 70;

create index if not exists erp_comerciales_manager_id_idx on public.erp_comerciales (manager_id);
create index if not exists erp_comerciales_role_idx on public.erp_comerciales (role);

comment on table public.erp_comerciales is 'Usuarios comerciales ERP (ids usr-*) — jerarquía y % comisionado';
comment on column public.erp_comerciales.commission_percentage is 'Porcentaje de comisión del comercial sobre montoInterno EnerSave';

update public.erp_comerciales set commission_percentage = 100 where id = 'usr-1';
update public.erp_comerciales set commission_percentage = 85 where id = 'usr-2';
update public.erp_comerciales set commission_percentage = 60 where id = 'usr-3';
update public.erp_comerciales set commission_percentage = 70 where id = 'usr-4';
update public.erp_comerciales set commission_percentage = 65 where id = 'usr-5';

commit;
