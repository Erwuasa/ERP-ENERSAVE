---
phase: ENERSAVE-02-pipeline-domain
plan: "01"
subsystem: database
tags: [supabase, postgres, ventas, pipeline, types]
requires:
  - phase: ENERSAVE-01-schema-supabase-ventas
    provides: prospectos table, ventas types and client baseline
provides:
  - 11-value prospectos.fase CHECK with legacy remap
  - Six PIPE-05 columns on prospectos
  - Updated ProspectoFase union and UpdateProspectoFaseInput
  - ventas.ts mappers for new columns
affects: [Phase 3 hooks, Phase 4 Pipeline UI]
tech-stack:
  added: []
  patterns: [DATA-05 migration order DROP CHECK → UPDATE → ADD columns → ADD CHECK]
key-files:
  created:
    - supabase/migrations/20260617000005_alter_prospectos_pipeline_v2.sql
  modified:
    - src/lib/ventas/types.ts
    - src/lib/supabase/ventas.ts
key-decisions:
  - "updateProspectoFase accepts UpdateProspectoFaseInput object for all PIPE-05 fields"
  - "MotivoDescarte typed union in types.ts; closed set validated in pipeline.ts"
requirements-completed: [DATA-05]
duration: 25min
completed: 2026-06-17
---

# Phase 2 Plan 02-01 Summary

**DATA-05 migration and TypeScript alignment for 11-phase prospectos pipeline with six new PIPE-05 columns.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Migration remaps legacy fases and adds subtipo, fecha contacto, sub_estado, motivos, fecha recontactar
- `ProspectoFase` union updated to 11 locked values
- `ventas.ts` row type, mappers, and `updateProspectoFase` support full transition context

## Files Created/Modified

- `supabase/migrations/20260617000005_alter_prospectos_pipeline_v2.sql` — DATA-05 schema
- `src/lib/ventas/types.ts` — 11 fases + enums + `UpdateProspectoFaseInput`
- `src/lib/supabase/ventas.ts` — column mappers and fase update patch

## Deviations from Plan

None — plan executed as written.

## User Setup Required

Apply migration `20260617000005` to Supabase (`supabase db push` or SQL Editor) before live CRUD with new fases/columns.

## Next Phase Readiness

- Types and mappers ready for `pipeline.ts` and Phase 3 hooks
- **Checkpoint:** migration must be applied remotely before UAT on new columns

---
*Phase: ENERSAVE-02-pipeline-domain*
*Completed: 2026-06-17*
