---
phase: 2
slug: pipeline-domain
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-17
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Wave 0 install) |
| **Config file** | `vite.config.ts` — add `test: { environment: "node" }` |
| **Quick run command** | `vitest run src/lib/ventas/pipeline.test.ts` |
| **Full suite command** | `vitest run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** `npm run lint` + `vitest run src/lib/ventas/pipeline.test.ts`
- **After every plan wave:** `vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-00-01 | 00 | 0 | PIPE-* | — | N/A | setup | `vitest run --version` | ❌ W0 | ⬜ pending |
| 02-01-01 | 01 | 1 | PIPE-01, PIPE-02 | T-02-01 | Pure validation; no auth | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "PIPELINE_FASE_CONFIG"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PIPE-02 | T-02-02 | Reject invalid transitions before persist | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "canTransition"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | PIPE-02 | T-02-02 | Spanish error messages on validateTransition | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "validateTransition"` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | PIPE-03 | — | Typed motivos; SLA constants | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "MOTIVOS_DESCARTE"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | PIPE-03, PIPE-04 | — | SLA urgency from diasEnFase | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "getSlaUrgencia"` | ❌ W0 | ⬜ pending |
| all | * | * | * | — | Types compile | static | `npm run lint` | ✓ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D vitest` + `test` script in `package.json`
- [ ] `vite.config.ts` — `test: { environment: "node" }`
- [ ] `src/lib/ventas/pipeline.ts` — module stub or full implementation
- [ ] `src/lib/ventas/pipeline.test.ts` — transition matrix tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| dias_en_fase from DB trigger | PIPE-04 | Trigger runtime in Postgres | Covered in Phase 1 UAT; Phase 2 reads mapped field only |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
