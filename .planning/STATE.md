---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-06-17T23:05:00.000Z"
last_activity: 2026-06-17 — Phase 2 executed (code complete)
progress:
  phases_total: 7
  phases_complete: 1
  requirements_total: 60
  requirements_complete: 7
---

# State

## Current Position

Phase: 2 — Pipeline Domain
Plan: 02-01, 02-02, 02-03 complete (code)
Status: Phase 2 code complete — apply DATA-05 migration checkpoint
Last activity: 2026-06-17 — Phase 2 pipeline domain implemented

## Accumulated Context

### Decisions

- **Dos módulos en una app:** Ventas (`/ventas/*`) + ERP Admin (`/erp/*`); mismo Supabase y auth; tablas compartidas, scope por rol (locked 2026-06-17)
- Selector de módulo solo jefe_comercial y superadmin; comercial entra directo a Ventas
- Tramitación prospecto en fase `tramitacion` → auto `contratos_equipo` visible en ERP Admin
- Ventas como módulo en `src/pages/ventas/` + ERP en `src/pages/erp/`
- **Pipeline 11 fases locked** — bidireccional; `tramitacion`/`activado`/`con_dudas`
- `updateProspectoFase` accepts `UpdateProspectoFaseInput` object for PIPE-05 fields
- `prospecto_nuevo` SLA uses `faseChangedAt` hours (4h), not `diasEnFase`
- Vitest 4.1.9 for pipeline unit tests

### Blockers

- **Checkpoint 02-01:** Apply migration `20260617000005` to Supabase
- **Checkpoint 01-01–01-02:** Phase 1 migrations if not yet applied
- Supabase MCP unauthorized — use CLI or Dashboard

### Todos

- [ ] Apply migration `20260617000005` (reply "migration applied")
- [ ] `/gsd-plan-phase 3` or `/gsd-execute-phase 3` — ventas hooks
- [ ] `/gsd-verify-work 1` after Phase 1 migrations applied
