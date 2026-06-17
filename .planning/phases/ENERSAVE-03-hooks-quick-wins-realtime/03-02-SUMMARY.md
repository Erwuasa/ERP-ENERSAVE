---
phase: ENERSAVE-03-hooks-quick-wins-realtime
plan: "02"
subsystem: api
tags: [react, hooks, prospectos, realtime, supabase]
requires:
  - phase: ENERSAVE-03-hooks-quick-wins-realtime
    provides: quick-wins from plan 03-01
  - phase: ENERSAVE-02-pipeline-domain
    provides: validateTransition
provides:
  - useProspectos with CRUD, changeFase + PIPE validation, quick-wins spawn
  - Realtime subscription on prospectos table
affects: [Phase 4 Pipeline UI, Phase 6 Ficha]
tech-stack:
  added: []
  patterns: [useRealtimeRefresh helper, VentasActor scope]
key-files:
  created:
    - src/lib/ventas/hooks/useProspectos.ts
    - src/lib/ventas/hooks/useRealtimeRefresh.ts
    - src/lib/ventas/hooks/types.ts
requirements-completed: [HOOK-01, HOOK-02]
duration: 25min
completed: 2026-06-17
---

# Phase 3 Plan 03-02 Summary

**useProspectos hook: validated fase changes, automatic quick-wins, and Realtime refresh.**

## Accomplishments

- `changeFase` calls `validateTransition` before `updateProspectoFase`
- Creates quick-win tasks after successful fase change (and on create)
- `useRealtimeRefresh` on `prospectos` for live updates
- Comercial scope enforced via `ListProspectosFilters`

---
*Phase: ENERSAVE-03-hooks-quick-wins-realtime*
*Completed: 2026-06-17*
