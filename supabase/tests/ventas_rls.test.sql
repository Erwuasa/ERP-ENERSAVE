-- RLS policy verification for ventas (DATA-02)
-- Prerequisite: migrations 20260617000001 through 20260617000004 applied
-- Run in Supabase SQL Editor with role postgres or service_role for setup,
-- then test blocks with simulated JWT claims.

-- Sample JWT payload for Dashboard "Test policy":
-- { "app_metadata": { "comercial_id": "usr-3", "role": "comercial" } }

-- --- Setup test prospectos (run once) ---
-- insert into public.prospectos (comercial_id, comercial_name, nombre, fase)
-- values ('usr-3', 'Ignacio Ortiz', 'Test RLS usr-3', 'prospecto_nuevo');
-- insert into public.prospectos (comercial_id, comercial_name, nombre, fase)
-- values ('usr-4', 'Marta Rivas', 'Test RLS usr-4', 'prospecto_nuevo');

-- --- Test: comercial usr-3 cannot read usr-4 prospecto ---
-- set local role authenticated;
-- select set_config('request.jwt.claims', '{"app_metadata":{"comercial_id":"usr-3","role":"comercial"}}', true);
-- select count(*) from public.prospectos where comercial_id = 'usr-4';
-- Expected: 0 rows

-- --- Test: jefe usr-2 sees direct reports usr-3 and usr-4 ---
-- select set_config('request.jwt.claims', '{"app_metadata":{"comercial_id":"usr-2","role":"jefe_comercial"}}', true);
-- select comercial_id, nombre from public.prospectos where comercial_id in ('usr-3','usr-4');
-- Expected: rows for usr-3 and usr-4 if seeded

-- --- Test: superadmin usr-1 sees all ---
-- select set_config('request.jwt.claims', '{"app_metadata":{"comercial_id":"usr-1","role":"superadmin"}}', true);
-- select count(*) from public.prospectos;
-- Expected: all rows

-- --- Test: actividades_ventas has no UPDATE policy for comercial ---
-- select count(*) from pg_policies
-- where tablename = 'actividades_ventas' and cmd = 'UPDATE';
-- Expected: 0

select 'ventas_rls.test.sql loaded — run blocks above after migrations applied' as status;
