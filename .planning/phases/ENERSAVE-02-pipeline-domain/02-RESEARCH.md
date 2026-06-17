# Phase ENERSAVE-02: Pipeline Domain - Research

**Researched:** 2026-06-17
**Domain:** Sales pipeline domain logic (transitions, SLA, badges, discard reasons) — pure TypeScript module
**Confidence:** HIGH (codebase patterns + DB schema verified); MEDIUM (SLA day defaults and transition branches — product assumptions)

## Summary

Phase 2 delivers **`src/lib/ventas/pipeline.ts`**: a pure, UI-free domain module that centralizes all pipeline business rules for the 10 `ProspectoFase` values already defined in Phase 1. The module mirrors **`src/lib/contract-estado.ts`** (const arrays, badge classes, capability predicates) and exports kanban column metadata in the shape consumed later by **`IncidenciasKanban.tsx`** (column `{ id, label, accent }`).

The transition model is a **directed graph**: a linear main path (`prospecto_nuevo` → … → `cliente_activo`) with **side exits** to `recontactar` and `descartado` from every non-terminal active fase, plus **limited backward edges** for renegotiation and missing documentation. Terminals are `cliente_activo` and `descartado` — no outgoing transitions. `validateTransition` must run **before** `updateProspectoFase` in hooks (Phase 3); the DB CHECK constraint only validates fase enum membership, not adjacency.

SLA defaults are **config constants** in `pipeline.ts` (`slaDiasMax` per fase), compared against `prospecto.diasEnFase` from the DB trigger `handle_dias_en_fase` `[VERIFIED: supabase/migrations/20260617000003_create_ventas_triggers.sql]`. Motivos de descarte are a **typed union** persisted as snake_case text in `motivo_descarte`. Vitest is the standard test runner for pure-function coverage — not yet installed; Wave 0 adds it co-located as `pipeline.test.ts`.

**Primary recommendation:** Implement `pipeline.ts` as a single pure module exporting `PIPELINE_FASE_CONFIG`, `TRANSITIONS`, `canTransition`, `getNextFases`, `validateTransition`, SLA helpers, and badge/column classes — then add vitest and a transition-matrix test suite before any UI work.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fase labels, colors, kanban order | Browser / Client (`pipeline.ts`) | — | Presentation config consumed by Phase 4 UI |
| Transition adjacency rules | Browser / Client (`pipeline.ts`) | — | PIPE-02; DB only CHECKs enum values, not graph |
| `motivo_descarte` required on descarte | Browser / Client (`validateTransition`) | Database (optional future CHECK) | App validates before `updateProspectoFase` |
| `dias_en_fase` computation | Database / Storage (trigger) | Browser (read mapped field) | Trigger owns counter; client compares for SLA |
| Fase change audit (`cambio_fase`) | Database / Storage (trigger) | — | Client must not duplicate — Phase 1 locked |
| Persist fase update | Browser / Client (`ventas.ts`) | Database (triggers on UPDATE) | Hook calls ventas layer after validation |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | `pipeline.ts` defines 10 fases with labels, colores, orden kanban y fases terminales | `PIPELINE_FASE_CONFIG` + `PIPELINE_KANBAN_COLUMNS`; `isTerminalFase` |
| PIPE-02 | Transiciones válidas validadas antes de persistir | `TRANSITIONS` map + `canTransition` + `validateTransition` |
| PIPE-03 | SLA por fase y motivos de descarte tipados | `slaDiasMax` per fase + `MotivoDescarte` union + `MOTIVOS_DESCARTE` |
| PIPE-04 | `dias_en_fase` visible en UI desde campo calculado en BD | Read `prospecto.diasEnFase`; `getSlaUrgencia(diasEnFase, fase)` |
</phase_requirements>

<user_constraints>
## User Constraints (from project context — no CONTEXT.md)

### Locked Decisions (PROJECT.md / STATE.md / Phase 1)

- Ventas module: `src/lib/ventas/` + `src/pages/ventas/` (Phase 2 delivers `pipeline.ts` only)
- 10 fases: `prospecto_nuevo` → `contactado` → `cualificado` → `propuesta_enviada` → `negociacion` → `documentacion` → `enviado` → `cliente_activo` + `recontactar` + `descartado`
- `ProspectoFase` union lives in `src/lib/ventas/types.ts` — do not duplicate enum values in pipeline.ts
- DB triggers own `cambio_fase` activity inserts — pipeline does not write timeline rows
- `updateProspectoFase` in `ventas.ts` PATCHes `fase` (+ `motivo_descarte` when descartado)
- UI conventions: `text-brand-*`, badges `text-[9px] font-mono font-bold`, dark mode `dark:`, motion from `motion/react`
- Named exports only; no `any`; Spanish user-facing validation messages

### Claude's Discretion

- Exact SLA day defaults per fase (no locked product values in discuss-phase)
- Whether to allow backward transitions (reproposal, missing docs)
- Strict vs loose `MotivoDescarte` validation (enum id vs free text "otro")
- Whether to add client-side `computeDiasEnFase` for stale DB counter (display-only)
- Vitest config: extend `vite.config.ts` vs dedicated `vitest.config.ts`

### Deferred Ideas (OUT OF SCOPE)

- Quick-wins task engine (Phase 3)
- Pipeline kanban UI, drag&drop (Phase 4)
- Hooks Realtime (Phase 3)
- Terminal kanban fade-out like incidencias (`isIncidenciaKanbanVisible`)
- DB CHECK on transition adjacency (client-only for v1.0)
- pg_cron nightly refresh of `dias_en_fase`
</user_constraints>

## Project Constraints (from .cursor/rules/)

No `.cursor/rules/` directory found in repo. Apply user rules from conversation:

- TypeScript functional style; named exports; interfaces over types where applicable
- Minimize scope — Phase 2 is `pipeline.ts` (+ tests), no UI files
- Match `contract-estado.ts` badge Tailwind patterns
- Zod available but optional for pipeline (pure validation functions suffice)

## Transition Graph Design

### Model: linear main path + branches

**Terminals:** `cliente_activo`, `descartado` — `getNextFases` returns `[]`.

**`recontactar`:** Recovery lane — returns to `contactado` or `descartado`. Does not skip ahead to mid-funnel fases.

**Backward edges (limited):**

| From | Back to | Business reason |
|------|---------|-----------------|
| `negociacion` | `propuesta_enviada` | Renegotiate / new offer |
| `documentacion` | `negociacion` | Terms changed before docs complete |
| `enviado` | `documentacion` | Tramitación blocked — missing docs |

### Recommended `TRANSITIONS` map

```typescript
export const TRANSITIONS: Record<ProspectoFase, readonly ProspectoFase[]> = {
  prospecto_nuevo: ["contactado", "recontactar", "descartado"],
  contactado: ["cualificado", "recontactar", "descartado"],
  cualificado: ["propuesta_enviada", "recontactar", "descartado"],
  propuesta_enviada: ["negociacion", "recontactar", "descartado"],
  negociacion: ["documentacion", "propuesta_enviada", "recontactar", "descartado"],
  documentacion: ["enviado", "negociacion", "recontactar", "descartado"],
  enviado: ["cliente_activo", "documentacion", "recontactar", "descartado"],
  cliente_activo: [],
  recontactar: ["contactado", "descartado"],
  descartado: [],
}
```

`canTransition(from, to)` → `from !== to && TRANSITIONS[from].includes(to)`.

**Same-fase updates:** Reject in `validateTransition` with code `same_fase`.

## SLA Defaults (PIPE-03)

ENERSAVE targets **5–30 comerciales** selling **luz/gas** to residential/SME accounts. Cycles are weeks, not months `[ASSUMED]`.

| Fase | `slaDiasMax` | Label (UI) | Rationale |
|------|-------------|------------|-----------|
| `prospecto_nuevo` | 2 | Prospecto nuevo | Speed-to-lead: contact within 48h |
| `contactado` | 3 | Contactado | Confirm interest / schedule qualification |
| `cualificado` | 5 | Cualificado | Gather CUPS, consumo, compañía |
| `propuesta_enviada` | 5 | Propuesta enviada | Follow up on sent offer |
| `negociacion` | 7 | Negociación | Price/terms back-and-forth |
| `documentacion` | 7 | Documentación | Collect DNI, factura, CUPS docs |
| `enviado` | 14 | Enviado | Tramitación / alta comercializadora |
| `cliente_activo` | `null` | Cliente activo | Success terminal — no SLA |
| `recontactar` | 14 | Recontactar | Nurture / callback window |
| `descartado` | `null` | Descartado | Terminal — no SLA |

**Urgency thresholds** `[ASSUMED]` 80% warning:

```typescript
export type SlaUrgencia = "ok" | "warning" | "breach" | "na"

export function getSlaUrgencia(diasEnFase: number, fase: ProspectoFase): SlaUrgencia {
  const max = getFaseConfig(fase).slaDiasMax
  if (max == null) return "na"
  if (diasEnFase >= max) return "breach"
  if (diasEnFase >= Math.ceil(max * 0.8)) return "warning"
  return "ok"
}
```

| Urgencia | Tailwind class |
|----------|----------------|
| `ok` | `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400` |
| `warning` | `bg-amber-500/10 text-amber-600 dark:text-amber-500` |
| `breach` | `bg-rose-500/10 text-rose-600 dark:text-rose-400` |
| `na` | `bg-slate-500/10 text-slate-500` |

## Motivos de Descarte (PIPE-03)

```typescript
export type MotivoDescarte =
  | "sin_respuesta"
  | "precio_no_competitivo"
  | "permanencia_vigente"
  | "no_interesado"
  | "fuera_de_perfil"
  | "datos_incorrectos"
  | "elige_competencia"
  | "consumo_insuficiente"
  | "suministro_no_viable"
  | "otro"

export const MOTIVOS_DESCARTE: readonly { id: MotivoDescarte; label: string }[] = [
  { id: "sin_respuesta", label: "Sin respuesta" },
  { id: "precio_no_competitivo", label: "Precio no competitivo" },
  { id: "permanencia_vigente", label: "Permanencia vigente" },
  { id: "no_interesado", label: "No interesado" },
  { id: "fuera_de_perfil", label: "Fuera de perfil" },
  { id: "datos_incorrectos", label: "Datos incorrectos" },
  { id: "elige_competencia", label: "Elige competencia" },
  { id: "consumo_insuficiente", label: "Consumo insuficiente" },
  { id: "suministro_no_viable", label: "Suministro no viable" },
  { id: "otro", label: "Otro" },
]
```

**`motivo_descarte` required when `fase = descartado`:**

- `requiresMotivoDescarte(fase)` → `fase === "descartado"`
- `validateTransition` returns `{ ok: false, code: "motivo_required", message: "Indica el motivo de descarte" }` when missing
- `updateProspectoFase` sets `motivo_descarte` only when provided `[VERIFIED: src/lib/supabase/ventas.ts:340-352]`

## Badge Colors, Labels & Kanban Order (PIPE-01)

| Order | Fase | Label | Column accent |
|-------|------|-------|---------------|
| 1 | `prospecto_nuevo` | Prospecto nuevo | `border-slate-500/30 bg-slate-500/5` |
| 2 | `contactado` | Contactado | `border-sky-500/30 bg-sky-500/5` |
| 3 | `cualificado` | Cualificado | `border-cyan-500/30 bg-cyan-500/5` |
| 4 | `propuesta_enviada` | Propuesta enviada | `border-blue-500/30 bg-blue-500/5` |
| 5 | `negociacion` | Negociación | `border-amber-500/30 bg-amber-500/5` |
| 6 | `documentacion` | Documentación | `border-violet-500/30 bg-violet-500/5` |
| 7 | `enviado` | Enviado | `border-indigo-500/30 bg-indigo-500/5` |
| 8 | `cliente_activo` | Cliente activo | `border-emerald-500/30 bg-emerald-500/5` |
| 9 | `recontactar` | Recontactar | `border-purple-500/30 bg-purple-500/5` |
| 10 | `descartado` | Descartado | `border-rose-500/30 bg-rose-500/5` |

Badge classes mirror `getContractEstadoBadgeClass` switch pattern `[VERIFIED: src/lib/contract-estado.ts:38-58]` — slate→sky→cyan→blue→amber→violet→indigo→emerald→purple→rose progression with `dark:` pairs.

```typescript
export interface PipelineFaseConfig {
  id: ProspectoFase
  label: string
  kanbanOrder: number
  columnAccent: string
  badgeClass: string
  slaDiasMax: number | null
  isTerminal: boolean
}
```

## API Design: `canTransition`, `getNextFases`, `validateTransition`

```typescript
import type { ProspectoFase } from "./types"

export type TransitionErrorCode =
  | "same_fase"
  | "invalid_transition"
  | "motivo_required"
  | "invalid_motivo"

export type TransitionValidationResult =
  | { ok: true }
  | { ok: false; code: TransitionErrorCode; message: string }

export function canTransition(from: ProspectoFase, to: ProspectoFase): boolean
export function getNextFases(from: ProspectoFase): readonly ProspectoFase[]
export function validateTransition(
  from: ProspectoFase,
  to: ProspectoFase,
  options?: { motivoDescarte?: string }
): TransitionValidationResult
export function isTerminalFase(fase: ProspectoFase): boolean
export function requiresMotivoDescarte(fase: ProspectoFase): boolean
```

**Validation order:** (1) same_fase (2) invalid_transition (3) motivo_required for descartado (4) optional invalid_motivo.

**Consumer flow (Phase 3):** `validateTransition` → toast on failure → `updateProspectoFase` on success. Messages in Spanish.

## `dias_en_fase`: DB vs Client (PIPE-04)

| What | Source |
|------|--------|
| Storage | DB `prospectos.dias_en_fase` via `handle_dias_en_fase` trigger `[VERIFIED: migration 000003]` |
| Reset on fase change | `handle_fase_change` sets `dias_en_fase = 0` |
| UI reads | `prospecto.diasEnFase` from `mapProspectoRow` |
| SLA compare | `getSlaUrgencia(prospecto.diasEnFase, prospecto.fase)` |

**Do not** recompute `floor(now - fase_changed_at)` in production pipeline code. Optional `computeDiasEnFase` for tests/display-only if stale counter is unacceptable.

**Known limitation:** Counter only updates on row insert/update, not at calendar midnight `[VERIFIED: Phase 1 RESEARCH Pitfall 5]`. v1.0: accept stale or refetch on Realtime.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.2 (repo) | Domain module | Project standard |
| `src/lib/ventas/types.ts` | Phase 1 | `ProspectoFase` | Single fase union source |
| Vitest | latest `[ASSUMED]` | Unit tests | Native Vite integration `[CITED: vitest.dev/guide/]` |

**No new runtime dependencies.**

```bash
npm install -D vitest
```

## Package Legitimacy Audit

| Package | Verdict | Disposition |
|---------|---------|-------------|
| `vitest` | `[ASSUMED]` OK | Approved — Wave 0 install |
| `zod` | OK (installed) | Optional |

**Packages removed due to SLOP verdict:** none

## Architecture Patterns

### Recommended Project Structure

```
src/lib/ventas/
  types.ts           # existing
  pipeline.ts        # NEW
  pipeline.test.ts   # NEW
```

### Pattern: `contract-estado.ts` domain module

Const arrays, switch badge classes, `isTerminal` predicates — pipeline adds `TRANSITIONS` adjacency map (no repo analog).

### Pattern: Kanban columns from `IncidenciasKanban.tsx`

Centralize `{ id, label, accent }` in `PIPELINE_KANBAN_COLUMNS` sorted by `kanbanOrder` `[VERIFIED: lines 12-16]`.

### Anti-Patterns

- Duplicating `ProspectoFase` in pipeline.ts
- Supabase calls in pipeline.ts
- Client `cambio_fase` inserts
- Skipping `validateTransition` in hooks
- Using types.ts union order for kanban columns

## Don't Hand-Roll

| Problem | Use Instead | Why |
|---------|-------------|-----|
| Fase audit rows | DB `handle_fase_change` | Single source of truth |
| Day counter | DB `dias_en_fase` | PIPE-04 |
| XState for 10 nodes | `TRANSITIONS` record | YAGNI |
| Custom test scripts | Vitest | Vite ecosystem standard |
| Inline badge Tailwind in UI | `getProspectoFaseBadgeClass` | One palette source |

## Common Pitfalls

1. **Transition map drift** — DB only CHECKs enum; client must own adjacency via unit tests
2. **Stale `dias_en_fase`** — SLA badges wrong until row touched; document or add display helper
3. **Descarte without motivo** — breaks Phase 7 reporting; enforce in `validateTransition`
4. **Terminal outgoing transitions** — `getNextFases` must return `[]` for `cliente_activo`/`descartado`
5. **Recontactar skip-ahead** — restrict to `contactado` only, not mid-funnel jumps

## Code Examples

### validateTransition

```typescript
export function validateTransition(from, to, options?) {
  if (from === to) return { ok: false, code: "same_fase", message: "El prospecto ya está en esta fase" }
  if (!canTransition(from, to)) return { ok: false, code: "invalid_transition", message: `No se puede pasar de ${getProspectoFaseLabel(from)} a ${getProspectoFaseLabel(to)}` }
  if (to === "descartado" && !options?.motivoDescarte?.trim()) return { ok: false, code: "motivo_required", message: "Indica el motivo de descarte" }
  return { ok: true }
}
```

### Vitest test

```typescript
import { describe, expect, it } from "vitest"
import { canTransition, validateTransition, isTerminalFase } from "./pipeline"

it("blocks transitions from terminal cliente_activo", () => {
  expect(isTerminalFase("cliente_activo")).toBe(true)
  expect(canTransition("cliente_activo", "contactado")).toBe(false)
})

it("requires motivo on descartado", () => {
  const r = validateTransition("contactado", "descartado")
  expect(r.ok).toBe(false)
})
```

### Vitest config (extend vite.config.ts)

```typescript
import { defineConfig } from "vitest/config"
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
})
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SLA day defaults in SLA table | SLA Defaults | Tune constants after UAT |
| A2 | 3 backward transitions allowed | Transition Graph | Simplify to forward-only |
| A3 | `recontactar` → `contactado` only | Transition Graph | Product may want other targets |
| A4 | 80% SLA warning threshold | SLA Defaults | UX preference change |
| A5 | vitest compatible with Vite 6 | Standard Stack | Pin version at install |
| A6 | Motivo ids as snake_case text | Motivos | Legacy rows need normalization |
| A7 | Stale dias_en_fase acceptable v1.0 | PIPE-04 | SLA visibility delayed |

## Open Questions

1. **SLA day defaults** — Ship proposed table as tunable `PIPELINE_FASE_CONFIG`; confirm with user after first pipeline UAT
2. **Backward transitions** — Include 3 edges by default; remove if user wants strict forward-only funnel
3. **`MotivoDescarte` on Prospecto type** — Keep `motivoDescarte?: string` on domain type; pipeline exports union for validation/UI only

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + vitest | ✓ | v24.x | — |
| TypeScript | pipeline.ts | ✓ | ~5.8.2 | — |
| Vite | Vitest | ✓ | ^6.2.3 | — |
| vitest | Unit tests | ✗ | — | `npm install -D vitest` Wave 0 |
| Supabase | Phase 2 logic | N/A | — | Pure module — no DB for unit tests |

**Missing dependencies with no fallback:** None blocking code (vitest needed for phase gate)

## Validation Architecture

> Nyquist enabled (no `workflow.nyquist_validation: false` in config).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (to install) `[CITED: vitest.dev/guide/]` |
| Config file | Extend `vite.config.ts` with `test` block |
| Quick run command | `vitest run src/lib/ventas/pipeline.test.ts` |
| Full suite command | `vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | 10 fases labels/badges/kanban order | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "PIPELINE_FASE_CONFIG"` | ❌ Wave 0 |
| PIPE-01 | Terminal fases no outgoing | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "terminal"` | ❌ Wave 0 |
| PIPE-02 | Valid/invalid transitions | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "canTransition"` | ❌ Wave 0 |
| PIPE-02 | Spanish error messages | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "validateTransition"` | ❌ Wave 0 |
| PIPE-03 | SLA urgency thresholds | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "getSlaUrgencia"` | ❌ Wave 0 |
| PIPE-03 | MOTIVOS_DESCARTE complete | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "MOTIVOS_DESCARTE"` | ❌ Wave 0 |
| PIPE-04 | SLA uses diasEnFase input | unit | `vitest run src/lib/ventas/pipeline.test.ts -t "getSlaUrgencia"` | ❌ Wave 0 |
| All | TypeScript compiles | static | `npm run lint` | ✓ |

### Sampling Rate

- **Per task commit:** `npm run lint` + `vitest run src/lib/ventas/pipeline.test.ts`
- **Per wave merge:** `vitest run`
- **Phase gate:** PIPE tests green + lint before `/gsd-verify-work 2`

### Wave 0 Gaps

- [ ] `npm install -D vitest` + `test` script in package.json
- [ ] `vite.config.ts` — `test: { environment: "node" }`
- [ ] `src/lib/ventas/pipeline.test.ts`
- [ ] `src/lib/ventas/pipeline.ts`

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V4 Access Control | No | RLS in Phase 1; pipeline has no per-user rules |
| V5 Input Validation | Yes | `validateTransition` + motivo trim; enum ids |

| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Forged fase transition | Tampering | Hook validates before Supabase PATCH |
| XSS via motivo text | Tampering | Enum ids; escape on UI render (Phase 4+) |

## Sources

### Primary (HIGH — codebase)

- `src/lib/ventas/types.ts`, `src/lib/contract-estado.ts`, `src/components/IncidenciasKanban.tsx`
- `src/lib/supabase/ventas.ts`, `supabase/migrations/20260617000002_create_ventas_core.sql`, `20260617000003_create_ventas_triggers.sql`
- `.planning/phases/ENERSAVE-02-pipeline-domain/PATTERNS.md`, Phase 1 `01-RESEARCH.md`

### Secondary (MEDIUM — official docs)

- [Vitest Getting Started](https://vitest.dev/guide/) — Vite >=6, `*.test.ts` convention

### Tertiary (LOW — assumed)

- Energy retail SLA benchmarks adapted for SMB `[ASSUMED]`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH
- Architecture: HIGH
- Pitfalls: HIGH
- SLA defaults: MEDIUM
- Transition branches: MEDIUM

**Research date:** 2026-06-17
**Valid until:** 2026-07-17

---

## RESEARCH COMPLETE

**Phase:** ENERSAVE-02 - Pipeline Domain
**Confidence:** HIGH (architecture/patterns); MEDIUM (SLA defaults + backward transitions)

### Key Findings

- **`pipeline.ts`** mirrors **`contract-estado.ts`** plus explicit **`TRANSITIONS`** adjacency map
- Linear path with **`recontactar`/`descartado`** side exits; terminals have no outgoing edges
- **`validateTransition`** gates **`updateProspectoFase`**; descarte requires **`motivo_descarte`**
- **`dias_en_fase`** from DB; **`getSlaUrgencia(diasEnFase, fase)`** for SLA badges
- **Vitest** co-located **`pipeline.test.ts`** — Wave 0 install

### File Created

`.planning/phases/ENERSAVE-02-pipeline-domain/02-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Vite 6 + vitest; contract-estado patterns verified |
| Architecture | HIGH | DB schema + ventas client + PATTERNS.md verified |
| Pitfalls | HIGH | dias_en_fase stale + motivo gap documented |
| SLA defaults | MEDIUM | Product assumptions — tunable constants |

### Open Questions

- Confirm SLA day table with user
- Confirm backward transitions (3 edges) vs forward-only

### Ready for Planning

Research complete. Planner can now create PLAN.md files.
