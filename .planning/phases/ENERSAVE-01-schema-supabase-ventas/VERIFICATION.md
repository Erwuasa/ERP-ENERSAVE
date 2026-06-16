---
phase: ENERSAVE-01-schema-supabase-ventas
verified: 2026-06-17T12:00:00Z
status: gaps_found
score: 11/15 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Migraciones aplican en Supabase sin error"
    status: failed
    reason: "Checkpoints 01-01 Task 3 y 01-02 Task 4 pendientes; migraciones solo en repo local, no aplicadas remotamente en esta sesión"
    artifacts:
      - path: supabase/migrations/20260617000001_create_erp_comerciales.sql
        issue: "Committed but not applied to remote project"
      - path: supabase/migrations/20260617000002_create_ventas_core.sql
        issue: "Committed but not applied to remote project"
      - path: supabase/migrations/20260617000003_create_ventas_triggers.sql
        issue: "Committed but not applied to remote project"
      - path: supabase/migrations/20260617000004_create_ventas_rls.sql
        issue: "Committed but not applied to remote project"
    missing:
      - "Aplicar migraciones 000001→000004 en orden vía `supabase db push` o SQL Editor"
      - "Confirmar tablas en `information_schema` y trigger `handle_fase_change` activo"
  - truth: "RLS impide que un comercial lea prospectos de otro comercial"
    status: failed
    reason: "Políticas DDL correctas en migración 000004, pero aislamiento no ejecutado ni verificado en Postgres remoto"
    artifacts:
      - path: supabase/tests/ventas_rls.test.sql
        issue: "Script documentado; bloques de prueba comentados, no ejecutados"
    missing:
      - "Aplicar migración RLS (000004) tras core migrations"
      - "Ejecutar bloques de ventas_rls.test.sql con JWT simulado (usr-3 no ve usr-4)"
      - "Confirmar 0 políticas UPDATE en actividades_ventas"
  - truth: "Funciones de lectura/escritura básicas probadas contra Supabase configurado"
    status: failed
    reason: "Cliente CRUD implementado; sin evidencia de smoke test live ni unit tests de mappers"
    artifacts:
      - path: src/lib/supabase/ventas.ts
        issue: "10 funciones exportadas pero no invocadas contra DB en SUMMARY ni tests"
    missing:
      - "Smoke read-only: `listProspectos({ comercialId: 'usr-3' })` tras migraciones"
      - "Documentar resultado en 01-03-SUMMARY o VERIFICATION follow-up"
  - truth: "npm run lint passes with new files"
    status: partial
    reason: "`npm run lint` (tsc --noEmit) falla por errores preexistentes en App.tsx y ContratosPanel.tsx; archivos ventas sin `any` y sin errores propios"
    artifacts:
      - path: src/App.tsx
        issue: "Errores TS2820/TS2322 en estados de contrato (fuera de alcance Phase 1)"
      - path: src/components/ContratosPanel.tsx
        issue: "NewContractFormState no definido (fuera de alcance Phase 1)"
    missing:
      - "Opcional: corregir errores TS preexistentes o documentar override si lint global no es gate de Phase 1"
human_verification:
  - test: "Aplicar migraciones 20260617000001–000004 en Supabase (orden estricto)"
    expected: "Tablas erp_comerciales, prospectos, actividades_ventas, tareas_ventas existen; triggers activos; RLS habilitado"
    why_human: "Supabase MCP no autorizado; apply remoto requiere credenciales/CLI del usuario"
  - test: "UPDATE prospecto.fase y comprobar fila actividades_ventas tipo cambio_fase"
    expected: "Nueva fila en actividades_ventas con tipo=cambio_fase y metadata fase_anterior/fase_nueva"
    why_human: "Comportamiento de trigger solo verificable en Postgres aplicado"
  - test: "Ejecutar ventas_rls.test.sql con JWT simulado (usr-3 comercial vs usr-4)"
    expected: "usr-3 count=0 para prospectos de usr-4; usr-2 jefe ve usr-3/usr-4; usr-1 superadmin ve todos"
    why_human: "RLS efectivo requiere sesión authenticated con claims simulados en SQL Editor"
  - test: "Smoke listProspectos con .env configurado (solo lectura)"
    expected: "VentasResult ok:true con array (vacío o con datos) o table_missing si migraciones pendientes"
    why_human: "Verifica integración cliente↔PostgREST con proyecto real"
---

# Phase 1: Schema & Supabase Ventas Verification Report

**Phase Goal:** Base de datos ventas verificada en repo, tipos TS y capa de acceso Supabase lista para hooks.

**Verified:** 2026-06-17T12:00:00Z

**Status:** gaps_found

**Re-verification:** No — initial verification

**Overall Verdict:** **INCOMPLETE**

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Migration files for erp_comerciales, prospectos, actividades_ventas, tareas_ventas exist in `supabase/migrations/` | ✓ VERIFIED | Four files `20260617000001`–`000004` present with substantive DDL |
| 2 | Triggers `handle_updated_at`, `handle_fase_change`, `handle_dias_en_fase` defined with COMMENT ON | ✓ VERIFIED | `20260617000003_create_ventas_triggers.sql` lines 4–90 |
| 3 | Migrations apply to Supabase without SQL errors | ✗ FAILED | `01-01-SUMMARY` checkpoint_status: pending; STATE.md notes remote apply pending |
| 4 | Updating `prospecto.fase` inserts `actividades_ventas` row with `tipo = cambio_fase` | ⚠️ UNCERTAIN | `handle_fase_change()` INSERT at migration 000003:28–44; runtime unverified until #3 |
| 5 | RLS enabled on prospectos, actividades_ventas, tareas_ventas, erp_comerciales | ✓ VERIFIED | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in 000004:66–69 |
| 6 | Comercial cannot SELECT prospectos outside accessible set | ✗ FAILED | Policy `prospectos_select_authenticated` correct in DDL; no executed RLS test |
| 7 | Jefe_comercial can SELECT direct reports via manager_id | ✓ VERIFIED | `private.accessible_comercial_ids()` jefe branch in 000004:48–53 |
| 8 | Superadmin can SELECT all prospectos | ✓ VERIFIED | Superadmin branch returns all `erp_comerciales.id` in 000004:46–47 |
| 9 | actividades_ventas has no UPDATE/DELETE for standard roles | ✓ VERIFIED | Only SELECT + INSERT policies; test script expects 0 UPDATE policies |
| 10 | `types.ts` exports Prospecto, ActividadVenta, TareaVenta and enums without `any` | ✓ VERIFIED | `src/lib/ventas/types.ts` — grep `\bany\b` = 0 matches |
| 11 | `ventas.ts` exports 10 CRUD functions with `VentasResult` unions | ✓ VERIFIED | All 10 `export async function` present; `rls_denied` in `mapSupabaseError` |
| 12 | Row mappers convert snake_case DB columns to camelCase | ✓ VERIFIED | `mapProspectoRow`, `mapActividadRow`, `mapTareaRow` + builders |
| 13 | `updateProspectoFase` does not insert `cambio_fase` activity | ✓ VERIFIED | Only `.update({ fase, motivo_descarte })` — no `createActividad` call |
| 14 | `npm run lint` passes with new files | ✗ FAILED | `tsc --noEmit` fails on App.tsx/ContratosPanel pre-existing errors; ventas files clean |
| 15 | Basic read/write functions tested against configured Supabase | ✗ FAILED | `.env` has VITE_SUPABASE_* but no smoke documented; tables likely missing remotely |

**Score:** 11/15 truths verified

---

## Roadmap Success Criteria

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| SC-1 | Migraciones `prospectos`, `actividades_ventas`, `tareas_ventas` existen en `supabase/migrations/` y aplican sin error | **PARTIAL** | Repo: ✓ (000001–000004). Remote apply: ✗ pending checkpoints |
| SC-2 | RLS impide que un comercial lea prospectos de otro comercial | **PARTIAL** | DDL policies: ✓. Runtime isolation: ✗ not tested |
| SC-3 | `types.ts` exporta interfaces y enums sin `any` | **PASS** | Full domain model in `src/lib/ventas/types.ts` |
| SC-4 | Funciones de lectura/escritura básicas probadas contra Supabase configurado | **FAIL** | Client implemented; no live or unit test evidence |

---

## Requirements Coverage (DATA-01 – DATA-04)

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| **DATA-01** | Migraciones locales alineadas con tablas ventas + triggers documentados | **PARTIAL** | Core DDL + triggers + COMMENT ON committed; remote apply and trigger runtime unverified |
| **DATA-02** | RLS por comercial y jerarquía | **PARTIAL** | `private.*` helpers + hierarchy policies in 000004; `ventas_rls.test.sql` not executed |
| **DATA-03** | Tipos TS en `types.ts` sin `any` | **PASS** | ProspectoFase (10), ActividadTipo, TareaTipo, interfaces complete |
| **DATA-04** | Cliente Supabase con mappers row ↔ domain | **PARTIAL** | `ventas.ts` 10 CRUD + mappers + `VentasResult`; not live-tested; not wired to UI (expected Phase 3) |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260617000001_create_erp_comerciales.sql` | Bridge table + seeds | ✓ VERIFIED | 30 lines; usr-1..usr-5 hierarchy |
| `supabase/migrations/20260617000002_create_ventas_core.sql` | Core ventas tables | ✓ VERIFIED | prospectos, actividades_ventas, tareas_ventas + FK to contratos_equipo |
| `supabase/migrations/20260617000003_create_ventas_triggers.sql` | Trigger functions | ✓ VERIFIED | 3 functions + 4 trigger attachments |
| `supabase/migrations/20260617000004_create_ventas_rls.sql` | RLS policies | ✓ VERIFIED | private schema + 14 policies |
| `supabase/tests/ventas_rls.test.sql` | RLS verification script | ⚠️ STUB-RUNTIME | Exists; tests commented; only status SELECT runs |
| `src/lib/ventas/types.ts` | Domain types | ✓ VERIFIED | 183 lines; zero `any` |
| `src/lib/supabase/ventas.ts` | Supabase client layer | ✓ VERIFIED | 465 lines; 10 CRUD exports |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `20260617000002_create_ventas_core.sql` | `contratos_equipo` | FK `contrato_equipo_id` | ✓ WIRED | Line 31 references `public.contratos_equipo(id)` |
| `20260617000003_create_ventas_triggers.sql` | `actividades_ventas` | `handle_fase_change` INSERT | ✓ WIRED | INSERT on fase UPDATE |
| `20260617000004_create_ventas_rls.sql` | `erp_comerciales` | `accessible_comercial_ids()` | ✓ WIRED | Hierarchy resolution in private helpers |
| `ventas.ts` | `types.ts` | `mapProspectoRow` → `Prospecto` | ✓ WIRED | Import + mapper return types |
| `ventas.ts` | `client.ts` | `getSupabaseClient()` | ✓ WIRED | `requireSupabase()` guard pattern |
| `ventas.ts` | `public.prospectos` | `.from("prospectos")` | ✓ WIRED | 5 query sites |
| App UI / hooks | `ventas.ts` | imports | ⚠️ ORPHANED | No consumer yet — acceptable for Phase 1 data-layer deliverable |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `ventas.ts` `listProspectos` | `data: Prospecto[]` | `getSupabaseClient().from("prospectos").select("*")` | Yes when tables exist + RLS permits | ⚠️ HOLLOW until migrations applied |
| `ventas.ts` `createProspecto` | `data: Prospecto` | `.insert().select().single()` | Yes when tables exist | ⚠️ HOLLOW until migrations applied |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 10 CRUD exports present | `grep export async function ventas.ts` | All 10 OK | ✓ PASS |
| Zero `any` in types | `grep \bany\b src/lib/ventas/types.ts` | 0 matches | ✓ PASS |
| `rls_denied` error mapping | `grep rls_denied ventas.ts` | 2 matches (type + mapper) | ✓ PASS |
| Project lint clean | `npm run lint` | Exit 2 — App.tsx/ContratosPanel errors | ✗ FAIL |
| Unit tests for mappers | `glob ventas*.test.*` | Only `ventas_rls.test.sql` (SQL) | ? SKIP |
| Live CRUD smoke | Not run (no writes; migrations pending) | — | ? SKIP |

---

## Probe Execution

Step 7c: **SKIPPED** — no `scripts/*/tests/probe-*.sh` declared or found for this phase.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX in phase files | — | — |
| `ventas_rls.test.sql` | 9–34 | Test blocks commented out | ℹ️ Info | By design — manual SQL Editor execution |

No blocker debt markers in phase-modified source files.

---

## Human Verification Required

### 1. Apply ventas migrations (blocking)

**Test:** Run `20260617000001` → `000002` → `000003` → `000004` in Supabase SQL Editor or `supabase db push`.

**Expected:** Four tables visible; triggers on prospectos/tareas; RLS enabled.

**Why human:** Remote apply blocked in verifier session (MCP unauthorized).

### 2. Verify fase-change trigger

**Test:** Insert prospecto, `UPDATE prospectos SET fase = 'contactado' WHERE id = …`, check `actividades_ventas`.

**Expected:** Row with `tipo = 'cambio_fase'` and descripcion `prospecto_nuevo → contactado`.

**Why human:** Trigger behavior requires live Postgres.

### 3. Run RLS isolation tests

**Test:** Execute uncommented blocks from `supabase/tests/ventas_rls.test.sql` with `set_config('request.jwt.claims', …)`.

**Expected:** Cross-comercial denial; jefe/superadmin visibility per script comments.

**Why human:** JWT simulation not automatable without DB session.

### 4. Optional live read smoke

**Test:** With migrations applied, call `listProspectos()` from dev console or one-off script.

**Expected:** `{ ok: true, data: [...] }` or empty array under anon (RLS may return zero rows without auth JWT).

**Why human:** Confirms PostgREST round-trip beyond static code review.

---

## Gaps Summary

Phase 1 **code artifacts are substantially complete in the repository**: four ordered migrations, RLS DDL, domain types, and a full Supabase client with mappers and error handling. SUMMARY claims match the committed files for schema, RLS, and TypeScript layers.

The phase goal is **not fully achieved** because three roadmap success criteria require **remote verification** that remains explicitly pending:

1. **Migrations not applied** — Checkpoints 01-01 Task 3 and 01-02 Task 4 block DATA-01 completion and prevent trigger/RLS runtime proof.
2. **RLS not executed** — Policies are correct in DDL but cross-comercial denial is unproven until `ventas_rls.test.sql` runs against applied schema.
3. **CRUD not live-tested** — DATA-04 client code exists; no smoke test evidence despite `.env` being configured.

**What the user must do to complete Phase 1:**

1. Apply migrations `20260617000001` through `20260617000004` in order on the Supabase project.
2. Verify tables/triggers via `information_schema` and a manual fase UPDATE test.
3. Run `ventas_rls.test.sql` JWT simulation blocks; confirm usr-3 cannot read usr-4 data.
4. Confirm `private` schema is **not** exposed in Supabase API settings.
5. (Recommended) Document `listProspectos` smoke result after apply; signal **"migrations applied"** to close checkpoints.
6. (Optional) Fix pre-existing `npm run lint` errors in App.tsx/ContratosPanel or accept as out-of-scope for Phase 1.

After steps 1–3 pass, re-run verification — expected outcome: DATA-01/DATA-02 PASS, SC-1/SC-2 PASS, overall **COMPLETE**.

---

## Deferred Items (not Phase 1 gaps)

| Item | Addressed In | Evidence |
|------|-------------|----------|
| `contratos_equipo` RLS | Phase 7 | Documented in 000004 header + 01-02-SUMMARY |
| Live app JWT auth for RLS | Auth milestone | Anon client returns zero rows by design until auth |
| UI wiring of `ventas.ts` | Phase 3 | Hooks consume client layer |

---

_Verified: 2026-06-17T12:00:00Z_

_Verifier: Claude (gsd-verifier)_
