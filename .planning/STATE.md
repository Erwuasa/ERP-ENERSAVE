---
milestone: v1.0
milestone_name: Sistema de Ventas — Capa de datos y Pipeline Core
status: planning
progress:
  phases_total: 7
  phases_complete: 0
  requirements_total: 42
  requirements_complete: 0
---

# State

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Roadmap approved — ready for `/gsd-plan-phase 1`
Last activity: 2026-06-17 — Milestone v1.0 initialized

## Accumulated Context

### Decisions

- Ventas como módulo en `src/pages/ventas/` + `src/lib/ventas/`
- Triggers Supabase para actividades en cambio de fase; quick-wins en cliente para tareas
- Conversión en fase `enviado` vía wizard existente

### Blockers

- Migraciones `prospectos` / `actividades_ventas` / `tareas_ventas` no están en repo local — verificar y commitear en fase 1
- Supabase MCP no autorizado en este entorno — validar schema manualmente o con CLI

### Todos

- [ ] Ejecutar `/gsd-discuss-phase 1` o `/gsd-plan-phase 1` para iniciar implementación
