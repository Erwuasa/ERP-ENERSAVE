---
phase: ENERSAVE-01-schema-supabase-ventas
plan: "01"
subsystem: database
tags: [supabase, migrations, ventas, triggers]
provides:
  - erp_comerciales bridge table with App profile seeds
  - prospectos, actividades_ventas, tareas_ventas core schema
  - handle_updated_at, handle_fase_change, handle_dias_en_fase triggers
affects: [ENERSAVE-01-02, ENERSAVE-01-03, Phase 2 pipeline]
tech-stack:
  added: []
  patterns: [idempotent migrations, SECURITY DEFINER triggers, snake_case DDL]
key-files:
  created:
    - supabase/migrations/20260617000001_create_erp_comerciales.sql
    - supabase/migrations/20260617000002_create_ventas_core.sql
    - supabase/migrations/20260617000003_create_ventas_triggers.sql
  modified: []
key-decisions:
  - "Text comercial_id (usr-*) aligned with contratos_equipo, not UUID auth"
  - "cambio_fase activities owned by DB trigger — client must not duplicate"
duration: 45min
completed: 2026-06-17
checkpoint_status: pending
---

# Phase 1 Plan 01-01 Summary

**Canonical ventas DDL and triggers committed to repo; remote apply pending human checkpoint.**

## Performance
- **Duration:** ~45min
- **Tasks:** 2 auto complete, 1 blocking checkpoint pending
- **Files modified:** 3 migration files created

## Accomplishments
- `erp_comerciales` bridge table with hierarchy seeds from App.tsx profiles (usr-1..usr-5)
- Core tables `prospectos`, `actividades_ventas`, `tareas_ventas` with CHECK constraints and indexes
- Triggers for `updated_at`, automatic `cambio_fase` audit on fase change, and `dias_en_fase` computation

## Task Commits
1. **Task 1–2: Migrations + triggers** — see commit hash after `feat(ENERSAVE-01): ventas schema migrations and triggers`

## Checkpoint [BLOCKING — PENDING]
**Task 3:** Apply migrations `20260617000001`–`000003` to Supabase.

- Supabase MCP returned Unauthorized in this environment
- Apply via `supabase db push` or paste each file in SQL Editor (order 01 → 02 → 03)
- Verify: 4 tables in `information_schema`; UPDATE fase inserts `actividades_ventas` with `tipo = cambio_fase`
- Resume signal: type **"migrations applied"** after verification

## Files Created
- `supabase/migrations/20260617000001_create_erp_comerciales.sql` — bridge + seeds
- `supabase/migrations/20260617000002_create_ventas_core.sql` — ventas core tables
- `supabase/migrations/20260617000003_create_ventas_triggers.sql` — trigger functions

## Decisions & Deviations
None — followed RESEARCH spec. Migrations written from plan when remote DDL was not in repo.

## Next Phase Readiness
- 01-02 RLS migration depends on tables existing remotely
- 01-03 TypeScript layer can lint/build without remote apply
