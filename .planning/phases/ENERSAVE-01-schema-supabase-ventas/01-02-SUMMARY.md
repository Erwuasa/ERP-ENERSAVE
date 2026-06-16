---
phase: ENERSAVE-01-schema-supabase-ventas
plan: "02"
subsystem: database
tags: [supabase, rls, security, ventas]
provides:
  - private schema RLS helpers (current_comercial_id, current_role, accessible_comercial_ids)
  - RLS policies on erp_comerciales, prospectos, actividades_ventas, tareas_ventas
  - ventas_rls.test.sql verification script
affects: [Phase 3 hooks, Phase 7 contratos integration]
tech-stack:
  added: []
  patterns: [SECURITY DEFINER helpers, deny-by-default RLS, immutable actividades timeline]
key-files:
  created:
    - supabase/migrations/20260617000004_create_ventas_rls.sql
    - supabase/tests/ventas_rls.test.sql
  modified: []
key-decisions:
  - "contratos_equipo RLS deferred to Phase 7"
  - "actividades_ventas: no UPDATE/DELETE for standard roles"
  - "anon without JWT returns zero rows until auth milestone"
duration: 30min
completed: 2026-06-17
checkpoint_status: pending
---

# Phase 1 Plan 01-02 Summary

**RLS migration and SQL test script committed; remote apply and policy smoke test pending.**

## Performance
- **Duration:** ~30min
- **Tasks:** 3 auto complete, 1 checkpoint pending
- **Files modified:** 2 files created

## Accomplishments
- `private.*` helpers resolve comercial from JWT `app_metadata` or `erp_comerciales.auth_user_id`
- Hierarchy-aware `accessible_comercial_ids()` for superadmin / jefe / comercial scopes
- RLS enabled on all ventas tables; actividades immutable for standard roles
- `supabase/tests/ventas_rls.test.sql` documents JWT simulation tests

## Task Commits
1. **Tasks 1–3: RLS migration + test script** — see commit `feat(ENERSAVE-01): ventas RLS policies and tests`

## Checkpoint [PENDING]
**Task 4:** Apply `20260617000004_create_ventas_rls.sql` after 01-01 migrations.

- Run `ventas_rls.test.sql` blocks in SQL Editor
- Confirm usr-3 cannot SELECT usr-4 prospectos
- Confirm `private` schema NOT exposed in Supabase API settings
- Resume when RLS migration applied and tests pass

## Files Created
- `supabase/migrations/20260617000004_create_ventas_rls.sql`
- `supabase/tests/ventas_rls.test.sql`

## Decisions & Deviations
None — followed plan. Header documents contratos_equipo RLS deferral.

## Next Phase Readiness
- TypeScript client (`ventas.ts`) maps errors including `rls_denied`
- Live isolation requires authenticated JWT or SQL Editor mock claims
