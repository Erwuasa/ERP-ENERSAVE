---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-06-17T15:00:00.000Z"
last_activity: 2026-06-17 — Phase 2 planned
progress:
  phases_total: 7
  phases_complete: 0
  requirements_total: 42
  requirements_complete: 0
---

# State

## Current Position

Phase: 2 — Pipeline Domain
Plan: 02-01, 02-02, 02-03 (11-phase replan, ready to execute)
Status: Phase 2 replanned — execute next
Last activity: 2026-06-17 — Phase 2 replanned for 11-fase pipeline

## Accumulated Context

### Decisions

- **Dos módulos en una app:** Ventas (`/ventas/*`) + ERP Admin (`/erp/*`); mismo Supabase y auth; tablas compartidas, scope por rol (locked 2026-06-17)
- Selector de módulo solo jefe_comercial y superadmin; comercial entra directo a Ventas
- Tramitación prospecto en fase `tramitacion` → auto `contratos_equipo` visible en ERP Admin
- Ventas como módulo en `src/pages/ventas/` + ERP en `src/pages/erp/`
- **Pipeline 11 fases locked** — bidireccional; `tramitacion`/`activado`/`con_dudas`; elimina `documentacion`/`enviado`/`cliente_activo` (DATA-05 en Phase 2)

### Blockers

- **Checkpoint 01-01:** Apply migrations 20260617000001–000003 to Supabase (`db push` or SQL Editor)
- **Checkpoint 01-02:** Apply migration 20260617000004 and run `ventas_rls.test.sql`
- Supabase MCP unauthorized — use CLI or Dashboard for apply

### Todos

- [ ] `/gsd-execute-phase 2` — pipeline.ts domain logic
- [ ] Complete Phase 1 migration checkpoints if not done
- [ ] `/gsd-verify-work 1` after remote apply
