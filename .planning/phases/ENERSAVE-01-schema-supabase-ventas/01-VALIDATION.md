---
phase: 01
slug: schema-supabase-ventas
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-17
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Wave 0 install) + SQL scripts in `supabase/tests/` |
| **Config file** | `vitest.config.ts` — Wave 0 installs if missing |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run lint && npx vitest run` (after Wave 0) |
| **Estimated runtime** | ~15 seconds (lint) + ~5s (vitest mappers) |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run lint + mapper unit tests (when Wave 0 complete)
- **Before `/gsd-verify-work`:** Lint green; SQL RLS script documented and runnable
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01-01 | 1 | DATA-01 | T-01-01 | DDL uses text comercial_id | grep | `test -f supabase/migrations/20260617000002_create_ventas_core.sql` | ✅ | ⬜ pending |
| 01-01-02 | 01-01 | 1 | DATA-01 | T-01-02 | Triggers handle_fase_change | grep | `grep handle_fase_change supabase/migrations/*.sql` | ✅ | ⬜ pending |
| 01-01-03 | 01-01 | 1 | DATA-01 | — | Migrations applied to Supabase | manual | Apply via `supabase db push` or SQL Editor | — | ⬜ pending |
| 01-02-01 | 01-02 | 2 | DATA-02 | T-01-05 | private schema helpers | grep | `grep 'create schema if not exists private' supabase/migrations/20260617000004_create_ventas_rls.sql` | ❌ W0 | ⬜ pending |
| 01-02-02 | 01-02 | 2 | DATA-02 | T-01-07 | No UPDATE on actividades | grep | `grep actividades_ventas supabase/migrations/20260617000004_create_ventas_rls.sql` | ❌ W0 | ⬜ pending |
| 01-02-03 | 01-02 | 2 | DATA-02 | T-01-05 | Cross-comercial denial | sql | `supabase/tests/ventas_rls.test.sql` (manual/SQL Editor) | ❌ W0 | ⬜ pending |
| 01-03-01 | 01-03 | 2 | DATA-03 | — | types.ts no any | lint | `npm run lint` | ❌ W0 | ⬜ pending |
| 01-03-02 | 01-03 | 2 | DATA-04 | T-01-11 | Mappers snake→camel | unit | `npx vitest run src/lib/supabase/ventas.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-03 | 01-03 | 2 | DATA-04 | — | 10 CRUD exports + smoke | grep/smoke | `grep export async function ventas.ts` + optional `.env` smoke | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` + `package.json` script `test` if not present
- [ ] `src/lib/supabase/ventas.test.ts` — mapper unit tests (mapProspectoRow round-trip)
- [ ] `supabase/tests/ventas_rls.test.sql` — RLS policy script (created in 01-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration apply to remote Supabase | DATA-01 | Requires credentials / CLI | Run `supabase db push` or paste migrations in SQL Editor; confirm tables exist |
| RLS JWT simulation | DATA-02 | Anon client cannot set JWT today | Run `ventas_rls.test.sql` in SQL Editor with documented claim payloads |
| Live CRUD smoke | DATA-04 | Needs VITE_SUPABASE_* in `.env` | With dev server env: call `listProspectos` + `createProspecto` from a one-off script or SUMMARY note |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers mapper tests and SQL script
- [x] No watch-mode flags
- [x] Feedback latency < 20s for lint path
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-17
