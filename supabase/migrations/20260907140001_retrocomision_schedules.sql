-- Calendarios de retrocomisión por compañía, segmento y peaje (data-driven)

begin;

create table if not exists public.retrocomision_schedules (
  id uuid primary key default gen_random_uuid(),
  compania text not null,
  segmento text not null default 'ambos' check (segmento in ('residencial', 'pyme', 'ambos')),
  peaje_tramo text,
  tipo_calculo text not null check (tipo_calculo in ('meses_flat', 'tramos_porcentaje', 'tramos_fijo_eur')),
  meses_flat integer,
  tramos jsonb not null default '[]'::jsonb,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_retrocomision_schedules_lookup
  on public.retrocomision_schedules (compania, segmento, peaje_tramo)
  where activo = true;

drop trigger if exists trg_retrocomision_schedules_updated_at on public.retrocomision_schedules;
create trigger trg_retrocomision_schedules_updated_at
  before update on public.retrocomision_schedules
  for each row
  execute function private.set_updated_at();

alter table public.retrocomision_schedules enable row level security;

drop policy if exists retrocomision_schedules_select on public.retrocomision_schedules;
create policy retrocomision_schedules_select on public.retrocomision_schedules
  for select to authenticated
  using (true);

drop policy if exists retrocomision_schedules_write on public.retrocomision_schedules;
create policy retrocomision_schedules_write on public.retrocomision_schedules
  for all to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'))
  with check (private.current_role() in ('superadmin', 'tramitacion'));

insert into public.retrocomision_schedules (compania, segmento, tipo_calculo, meses_flat, notas) values
  ('Naturgy', 'residencial', 'meses_flat', 4, 'Luz y gas, mismo plazo'),
  ('Octopus Energy', 'ambos', 'meses_flat', 6, null),
  ('TotalEnergies', 'ambos', 'meses_flat', 12, null),
  ('Ignis', 'ambos', 'meses_flat', 12, null),
  ('Axpo', 'ambos', 'meses_flat', 12, null),
  ('Endesa', 'residencial', 'meses_flat', 6, 'Plazo por defecto, pendiente de aclarar si tabla de tramos MOBILE/PRESCRIPTOR aplica aquí también');

insert into public.retrocomision_schedules (compania, segmento, tipo_calculo, tramos) values
  ('Naturgy', 'pyme', 'tramos_porcentaje', '[
    {"desde_mes": 0, "hasta_mes": 6, "valor": 100, "unidad": "porcentaje"},
    {"desde_mes": 6, "hasta_mes": 9, "valor": 50, "unidad": "porcentaje"},
    {"desde_mes": 9, "hasta_mes": 12, "valor": 25, "unidad": "porcentaje"}
  ]'::jsonb),
  ('Gana Energia', 'ambos', 'tramos_porcentaje', '[
    {"desde_mes": 0, "hasta_mes": 3, "valor": 100, "unidad": "porcentaje"},
    {"desde_mes": 3, "hasta_mes": 6, "valor": 75, "unidad": "porcentaje"},
    {"desde_mes": 6, "hasta_mes": 9, "valor": 50, "unidad": "porcentaje"},
    {"desde_mes": 9, "hasta_mes": 12, "valor": 25, "unidad": "porcentaje"}
  ]'::jsonb),
  ('Repsol', 'pyme', 'tramos_porcentaje', '[
    {"desde_mes": 0, "hasta_mes": 1, "valor": 100, "unidad": "porcentaje"},
    {"desde_mes": 1, "hasta_mes": 2, "valor": 91, "unidad": "porcentaje"},
    {"desde_mes": 2, "hasta_mes": 3, "valor": 82, "unidad": "porcentaje"},
    {"desde_mes": 3, "hasta_mes": 4, "valor": 73, "unidad": "porcentaje"},
    {"desde_mes": 4, "hasta_mes": 5, "valor": 64, "unidad": "porcentaje"},
    {"desde_mes": 5, "hasta_mes": 6, "valor": 55, "unidad": "porcentaje"},
    {"desde_mes": 6, "hasta_mes": 7, "valor": 45, "unidad": "porcentaje"},
    {"desde_mes": 7, "hasta_mes": 8, "valor": 36, "unidad": "porcentaje"},
    {"desde_mes": 8, "hasta_mes": 9, "valor": 27, "unidad": "porcentaje"},
    {"desde_mes": 9, "hasta_mes": 10, "valor": 18, "unidad": "porcentaje"},
    {"desde_mes": 10, "hasta_mes": 11, "valor": 9, "unidad": "porcentaje"},
    {"desde_mes": 11, "hasta_mes": 12, "valor": 0, "unidad": "porcentaje"}
  ]'::jsonb),
  ('Repsol', 'residencial', 'tramos_porcentaje', '[
    {"desde_mes": 0, "hasta_mes": 4, "valor": 100, "unidad": "porcentaje"}
  ]'::jsonb);

insert into public.retrocomision_schedules (compania, segmento, peaje_tramo, tipo_calculo, tramos) values
  ('Iberdrola', 'ambos', '2.0TD', 'tramos_fijo_eur', '[
    {"desde_mes": 0, "hasta_mes": 3, "valor": 100, "unidad": "porcentaje"},
    {"desde_mes": 3, "hasta_mes": 6, "valor": 25, "unidad": "eur_fijo"},
    {"desde_mes": 6, "hasta_mes": 9, "valor": 15, "unidad": "eur_fijo"},
    {"desde_mes": 9, "hasta_mes": 12, "valor": 10, "unidad": "eur_fijo"}
  ]'::jsonb),
  ('Iberdrola', 'ambos', '3.0TD_6.1TD', 'tramos_porcentaje', '[
    {"desde_mes": 0, "hasta_mes": 3, "valor": 100, "unidad": "porcentaje"},
    {"desde_mes": 3, "hasta_mes": 6, "valor": 75, "unidad": "porcentaje"},
    {"desde_mes": 6, "hasta_mes": 9, "valor": 25, "unidad": "porcentaje"},
    {"desde_mes": 9, "hasta_mes": 12, "valor": 15, "unidad": "porcentaje"}
  ]'::jsonb);

insert into public.retrocomision_schedules (compania, segmento, tipo_calculo, tramos, notas) values
  ('Niba', 'ambos', 'tramos_porcentaje', '[
    {"desde_mes": 0, "hasta_mes": 2, "valor": 100, "unidad": "porcentaje"},
    {"desde_mes": 2, "hasta_mes": 4, "valor": 83, "unidad": "porcentaje"},
    {"desde_mes": 4, "hasta_mes": 6, "valor": 67, "unidad": "porcentaje"},
    {"desde_mes": 6, "hasta_mes": 8, "valor": 50, "unidad": "porcentaje"},
    {"desde_mes": 8, "hasta_mes": 10, "valor": 33, "unidad": "porcentaje"},
    {"desde_mes": 10, "hasta_mes": 12, "valor": 17, "unidad": "porcentaje"}
  ]'::jsonb, 'PROVISIONAL: interpolacion lineal, pendiente de tabla real de Niba — no usar en produccion sin confirmar con el usuario');

commit;
