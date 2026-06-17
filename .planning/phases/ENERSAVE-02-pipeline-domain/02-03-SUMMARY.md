---
phase: ENERSAVE-02-pipeline-domain
plan: "03"
subsystem: api
tags: [sla, motivos-descarte, badges, pipeline]
requires:
  - phase: ENERSAVE-02-pipeline-domain
    provides: pipeline.ts core from plan 02-02
provides:
  - getSlaUrgencia with 4h hour SLA for prospecto_nuevo
  - MOTIVOS_DESCARTE (9 ids) and subtipo/sub_estado catalogs
  - isSubtipoPrioridadMaxima (PIPE-06)
  - getSlaBadgeClass and getProspectoFaseBadgeClass
affects: [Phase 4 Pipeline UI, Phase 5 Mi Día]
tech-stack:
  added: []
  patterns: [WARNING_RATIO 0.8 SLA bands, faseChangedAt hours for prospecto_nuevo]
key-files:
  modified:
    - src/lib/ventas/pipeline.ts
    - src/lib/ventas/pipeline.test.ts
key-decisions:
  - "prospecto_nuevo SLA uses faseChangedAt hours, not diasEnFase"
  - "All four subtipos return max priority (PIPE-06 locked)"
requirements-completed: [PIPE-03, PIPE-04, PIPE-06]
duration: 20min
completed: 2026-06-17
---

# Phase 2 Plan 02-03 Summary

**SLA urgency math, nine motivos de descarte, subtipo priority, and badge helpers exported from pipeline.ts.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- `getSlaUrgencia`: hour-based 4h SLA, custom fecha contacto, day-based diasEnFase, `na` for side lanes
- `MOTIVOS_DESCARTE` with 9 locked ids + `isMotivoDescarte` guard
- `getSlaBadgeClass` / `getProspectoFaseBadgeClass` for Phase 4 UI
- Full test suite green (31 tests)

## Deviations from Plan

None — plan executed as written.

## Next Phase Readiness

- Phase 4 Pipeline UI can consume config, badges, and SLA urgency without reimplementing rules
- Phase 5 Mi Día can use `isSubtipoPrioridadMaxima` for sort priority

---
*Phase: ENERSAVE-02-pipeline-domain*
*Completed: 2026-06-17*
