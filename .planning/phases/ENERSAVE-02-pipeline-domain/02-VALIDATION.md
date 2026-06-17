---
phase: 2
slug: pipeline-domain
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-17
updated: 2026-06-17
---

# Phase 2 — Validation Strategy (11-phase replan)

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Wave 0 in 02-02 Task 1) |
| **Config file** | `vite.config.ts` — `test: { environment: "node" }` |
| **Quick run command** | `npm run test -- src/lib/ventas/pipeline.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** `npm run lint` + targeted pipeline tests when applicable
- **After every plan wave:** `npm run test`
- **Before `/gsd-verify-work`:** Full suite green + DATA-05 applied remotely
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 02-01-01 | 02-01 | 1 | DATA-05 | grep | migration DDL greps (11 fase, 6 cols, remap) | ⬜ pending |
| 02-01-02 | 02-01 | 1 | DATA-05 | static | `npm run lint` + types/mappers greps | ⬜ pending |
| 02-01-03 | 02-01 | 1 | DATA-05 | manual | Supabase apply checkpoint | ⬜ pending |
| 02-02-01 | 02-02 | 2 | PIPE-* | setup | `vitest run --version`, `npm run lint` | ⬜ pending |
| 02-02-02 | 02-02 | 2 | PIPE-01,02 | unit | `npm run test -- pipeline.test.ts -t "PIPELINE_FASE_CONFIG"` | ⬜ pending |
| 02-02-03 | 02-02 | 2 | PIPE-02,05 | unit | `npm run test -- pipeline.test.ts -t "canTransition\|validateTransition"` | ⬜ pending |
| 02-03-01 | 02-03 | 3 | PIPE-03,06 | unit | `npm run test -- pipeline.test.ts -t "MOTIVOS_DESCARTE\|SUBTIPOS"` | ⬜ pending |
| 02-03-02 | 02-03 | 3 | PIPE-03,04 | unit | `npm run test -- pipeline.test.ts -t "getSlaUrgencia"` | ⬜ pending |
| 02-03-03 | 02-03 | 3 | PIPE-01,03 | unit | `npm run test` + lint | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `npm install -D vitest` + `test` script (02-02 Task 1)
- [ ] `vite.config.ts` test block
- [ ] `src/lib/ventas/pipeline.ts` + `pipeline.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DATA-05 migration apply | DATA-05 | Supabase credentials | Apply `20260617000005` via db push or SQL Editor |
| Legacy row remap | DATA-05 | Postgres runtime | Verify 0 rows with old fase values post-migrate |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or checkpoint
- [x] Wave 0 covered by 02-02 Task 1
- [x] `nyquist_compliant: true`
- **Approval:** pending execution
