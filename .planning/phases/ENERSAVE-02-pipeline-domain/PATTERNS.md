# Phase ENERSAVE-02: Pipeline Domain — Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 3 new (+ 1 optional test)
**Analogs found:** 3 / 4 (no JS/TS test analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/ventas/pipeline.ts` | utility / domain | transform + validation | `src/lib/contract-estado.ts` | exact (estado domain) |
| `src/lib/ventas/types.ts` | model | — | (exists; import only) | exact |
| `src/lib/ventas/pipeline.test.ts` (optional 02-01) | test | batch | `supabase/tests/ventas_rls.test.sql` | partial (SQL only) |
| Future `Pipeline.tsx` (Phase 4, not Phase 2) | component | CRUD + event-driven | `src/components/IncidenciasKanban.tsx` | role-match |

**Phase 2 scope (ROADMAP):** Pure domain module — no UI files. Kanban analog informs column config exported from `pipeline.ts`, not a new component.

---

## Pattern Assignments

### `src/lib/ventas/pipeline.ts` (utility, transform + validation)

**Primary analog:** `src/lib/contract-estado.ts`
**Secondary analogs:** `src/lib/incidencias.ts` (terminal helpers), `src/lib/contract-penalty.ts` (pure functions, no side effects)

**What to copy from `contract-estado.ts`**

| Concern | Copy | Differ |
|---------|------|--------|
| **Naming** | `CONTRACT_ESTADOS` → `PIPELINE_FASES` or `PROSPECTO_FASES`; derived type from `as const` array | Fase values are **snake_case DB keys** (`prospecto_nuevo`), not display labels |
| **Initial / special constants** | `CONTRACT_ESTADO_INICIAL`, `CONTRACT_ESTADO_INCOMPLETO` | `FASE_INICIAL = "prospecto_nuevo"`; terminal fases `cliente_activo`, `descartado` |
| **Normalization** | `normalizeContractEstado` + `LEGACY_ESTADO_MAP` | Optional `normalizeProspectoFase` only if legacy strings expected; DB CHECK is strict |
| **Badge classes** | `getContractEstadoBadgeClass` switch → Tailwind utility strings | 10 fases, distinct palette; keep `dark:` pairs like contract-estado |
| **Capability predicates** | `canActivateContract`, `isContractTerminal` | `canTransition`, `isTerminalFase`, `requiresMotivoDescarte` |
| **Exports** | Named exports only, no default; functions + const arrays at top | Re-export `ProspectoFase` from `./types` only if UI convenience needed — prefer importing types from `types.ts` |

**Imports pattern** (pipeline.ts — follow sibling `types.ts`, not contract-estado's zero-import style):

```typescript
import type { ProspectoFase } from "./types"
```

**Const array + derived type** (lines 1-15 of `contract-estado.ts`):

```typescript
export const CONTRACT_ESTADOS = [
  "Pendiente de info.",
  "PTE DE TRAMITACIÓN",
  // ...
] as const

export type ContractEstado = (typeof CONTRACT_ESTADOS)[number]

export const CONTRACT_ESTADO_INICIAL: ContractEstado = "PTE DE TRAMITACIÓN"
```

**Apply to pipeline.ts:** Build `PROSPECTO_FASES` from the existing union in `types.ts` (order = kanban order). Export `PipelineFaseConfig` objects: `{ id, label, kanbanOrder, badgeClass, slaDiasMax }`.

**Badge class pattern** (lines 38-58 of `contract-estado.ts`):

```typescript
export function getContractEstadoBadgeClass(estado: string): string {
  switch (normalizeContractEstado(estado)) {
    case "Pendiente de info.":
      return "bg-slate-400/20 text-slate-600 dark:text-slate-300 border border-slate-400/30"
    case "PTE DE TRAMITACIÓN":
      return "bg-[#f4f4f5] text-slate-700 dark:bg-slate-700/80 dark:text-slate-200 border border-slate-300/60 dark:border-slate-500/40"
    // ...
    default:
      return "bg-slate-500/15 text-slate-500 border border-slate-500/20"
  }
}
```

**Apply:** `getProspectoFaseBadgeClass(fase: ProspectoFase): string` — same Tailwind density (`bg-*`, `dark:*`, `border`).

**Terminal + capability predicates** (lines 61-77 of `contract-estado.ts`):

```typescript
export function canActivateContract(estado: string): boolean {
  const e = normalizeContractEstado(estado)
  return e === "PTE DE FIRMA" || e === "PTE DE TRAMITACIÓN" || e === "INCIDENCIA ADMINISTRATIVA"
}

export function isContractTerminal(estado: string): boolean {
  const e = normalizeContractEstado(estado)
  return e === "Dado de Baja" || e === "FIRMA CADUCADA"
}
```

**Apply:** `isTerminalFase(fase)` → `cliente_activo | descartado`. `canTransition(from, to)` validates against explicit adjacency map (contract-estado has **no** transition map — pipeline must add `TRANSITIONS: Record<ProspectoFase, readonly ProspectoFase[]>`).

**Normalization** (lines 17-36 of `contract-estado.ts`):

```typescript
const LEGACY_ESTADO_MAP: Record<string, ContractEstado> = { ... }

export function normalizeContractEstado(value: string): ContractEstado {
  if (CONTRACT_ESTADOS.includes(value as ContractEstado)) {
    return value as ContractEstado
  }
  const key = value.toLowerCase().trim()
  return LEGACY_ESTADO_MAP[key] ?? CONTRACT_ESTADO_INICIAL
}
```

**Differ:** Prospecto fases are DB-enforced; normalization is lower priority than for contracts. Default fallback should be `prospecto_nuevo` or throw/return error in `canTransition` — document choice in plan.

---

**What to copy from `incidencias.ts`**

| Concern | Copy | Differ |
|---------|------|--------|
| **String union types** | `IncidenciaEstado`, `IncidenciaTipo` as exported unions | `MotivoDescarte` union for PIPE-03 (new — no DB enum yet) |
| **Terminal visibility** | `isIncidenciaKanbanVisible` + `TERMINAL_ESTADO_VISIBLE_MS` | Optional `isProspectoKanbanVisible` — **deferred** unless product wants descartados to fade after 7d (REQUIREMENTS: out of scope for incidencias-style merge) |
| **State mutation helper** | `withIncidenciaEstado` sets `estadoAt` on terminal transition | Prospecto fase timestamps live in DB (`fase_changed_at`); client helper not needed for Phase 2 — hooks call `updateProspectoFase` |

**Terminal helper** (lines 23-33 of `incidencias.ts`):

```typescript
const TERMINAL_ESTADO_VISIBLE_MS = 7 * 24 * 60 * 60 * 1000

export function isIncidenciaKanbanVisible(
  inc: IncidenciaTicket,
  referenceDate?: Date
): boolean {
  const ref = referenceDate instanceof Date ? referenceDate : new Date()
  if (inc.estado === "pendiente") return true
  if (!inc.estadoAt) return true
  return ref.getTime() - new Date(inc.estadoAt).getTime() <= TERMINAL_ESTADO_VISIBLE_MS
}
```

**Motivo descarte typing** (mirror `IncidenciaTipo` lines 3-8):

```typescript
export type IncidenciaTipo =
  | "Tarifa Incorrecta"
  | "Retraso de Firma"
  // ...
```

**Apply:** `export type MotivoDescarte = "sin_respuesta" | "precio" | ...` + `MOTIVOS_DESCARTE` const array with `{ id, label }` for UI selects (Phase 4).

---

**What to copy from `contract-penalty.ts`**

Pure function module: interfaces + exported functions, no React, no Supabase.

```typescript
export function calcularPenalizacion(input: PenaltyInput): number | null {
  // guard clauses early
  if (precioFijoConsumo == null || precioFijoConsumo <= 0) return null
  // ...
}
```

**Apply:** SLA helpers — `getSlaUrgencia(diasEnFase: number, fase: ProspectoFase): "ok" | "warning" | "breach"` and `getSlaBadgeClass(urgencia)` using `slaDiasMax` from fase config.

---

**Kanban column config (export from pipeline.ts, consumed later by UI)**

**Analog UI:** `IncidenciasKanban.tsx` lines 12-16 — column metadata lives in component today; Phase 2 should **centralize** in pipeline:

```typescript
const KANBAN_COLUMNS: { id: IncidenciaEstado; label: string; accent: string }[] = [
  { id: "pendiente", label: "Pendiente", accent: "border-rose-500/30 bg-rose-500/5" },
  { id: "resuelta", label: "Resuelta", accent: "border-emerald-500/30 bg-emerald-500/5" },
  { id: "cancelada", label: "Cancelada", accent: "border-slate-500/30 bg-slate-500/5" },
]
```

**Differ:** 10 columns; `id` = `ProspectoFase`; `accent` for column chrome; `label` = Spanish display string; order from `kanbanOrder` not enum declaration order (`recontactar` / `descartado` are not linear tail).

**Suggested exports for PIPE-01:**

```typescript
export const PIPELINE_KANBAN_COLUMNS: readonly PipelineFaseConfig[]
export function getNextFases(from: ProspectoFase): readonly ProspectoFase[]
export function canTransition(from: ProspectoFase, to: ProspectoFase): boolean
export function validateTransition(
  from: ProspectoFase,
  to: ProspectoFase,
  motivoDescarte?: string
): { ok: true } | { ok: false; message: string }
```

**Transition validation error messages:** Spanish, user-facing (matches `VentasResult.message` tone in `src/lib/supabase/ventas.ts` line 114-115).

---

### `src/lib/ventas/types.ts` (model — modify only if needed)

**Analog:** Self (Phase 1 output); design reference `src/lib/incidencias.ts`

**Current `ProspectoFase`** (lines 1-11):

```typescript
export type ProspectoFase =
  | "prospecto_nuevo"
  | "contactado"
  | "cualificado"
  | "propuesta_enviada"
  | "negociacion"
  | "documentacion"
  | "enviado"
  | "cliente_activo"
  | "recontactar"
  | "descartado"
```

**What to copy:** Keep fase union here; **do not duplicate** in `pipeline.ts`. Optional: add `motivoDescarte?: MotivoDescarte` on `Prospecto` if motivos become enum — today `motivoDescarte?: string` (line 47).

**Differ from incidencias:** `IncidenciaTicket` is defined in same file as helpers; ventas split is `types.ts` (interfaces) + `pipeline.ts` (config/rules) — follow Phase 1 layout from `01-RESEARCH.md`.

**DB alignment:** CHECK constraint in `20260617000002_create_ventas_core.sql` lines 14-26 lists same 10 values — pipeline config must stay in sync.

---

### `src/lib/ventas/pipeline.test.ts` (test — no TS analog)

**Closest reference:** `supabase/tests/ventas_rls.test.sql` (comment-driven manual tests, not automated)

**Project state:** `package.json` has no `vitest` / `jest` — only `tsc --noEmit` lint script.

**Planner recommendation:**

| Option | Pattern |
|--------|---------|
| **A (preferred for "testable")** | Add `vitest` devDependency; place `src/lib/ventas/pipeline.test.ts` co-located with module (common TS convention; no existing example in repo) |
| **B** | Pure functions testable via `tsx` one-off script in plan verification step |
| **C** | Defer automated tests to Phase 3 hook integration |

**What to test (from ROADMAP success criteria):** `canTransition` matrix, `validateTransition` with/without motivo on `descartado`, SLA urgency thresholds, kanban column order stability.

**SQL test location pattern** (`supabase/tests/ventas_rls.test.sql`):

```sql
-- Prerequisite: migrations ... applied
-- Expected: 0 rows
select 'ventas_rls.test.sql loaded — run blocks above after migrations applied' as status;
```

Not applicable to pipeline domain logic — do not put transition rules in SQL tests.

---

### `src/components/IncidenciasKanban.tsx` (reference for Phase 4 UI — not Phase 2)

**Role:** component, event-driven (drag-drop)

**What Phase 2 should supply for future UI:**

| IncidenciasKanban pattern | Pipeline equivalent |
|---------------------------|-------------------|
| `KANBAN_COLUMNS` local const | `PIPELINE_KANBAN_COLUMNS` from `pipeline.ts` |
| `onMove(id, estado)` callback | Hook calls `validateTransition` then `updateProspectoFase` |
| `handleDrop` guards same-column | `canDrag` + `canTransition` before drop |
| `dataTransfer.setData("text/incidencia-id", ...)` | Use `text/prospecto-id` MIME for Pipeline kanban |
| `prioridadBadgeClass` local helper | `getSlaBadgeClass` / `getProspectoFaseBadgeClass` from pipeline |
| Re-export types from lib (`export type { IncidenciaEstado, ... }` lines 10) | Pipeline.tsx may re-export `ProspectoFase` from types |

**Props pattern** (lines 26-33):

```typescript
interface IncidenciasKanbanProps {
  incidencias: IncidenciaTicket[]
  showComercialName: boolean
  canEdit: boolean
  canDrag: boolean
  onSave: (updated: IncidenciaTicket) => void
  onMove: (id: string, estado: IncidenciaEstado) => void
}
```

**App.tsx integration** (lines 1585-1627): parent filters data, passes handlers — Phase 3 hooks replace in-memory `setIncidencias`; pipeline validation runs inside hook before `updateProspectoFase`.

---

## Shared Patterns

### Domain lib file layout (`src/lib/`)

**Source:** `src/lib/contract-estado.ts`, `src/lib/incidencias.ts`, `src/lib/contract-potencia.ts`

- One concern per file under `src/lib/` or `src/lib/ventas/`
- Named exports only
- No React imports in domain libs
- Spanish user strings in validation messages

### Badge styling (ERP convention)

**Source:** `contract-estado.ts` + `ContratosPanel.tsx` lines 164-166

```typescript
className={`... text-[10px] font-mono font-bold ... ${getContractEstadoBadgeClass(estado)}`}
```

**Apply to SLA badges:** `text-[9px] font-mono font-bold` per PROJECT.md UI conventions.

### Supabase fase update (consumer in Phase 3 — not Phase 2)

**Source:** `src/lib/supabase/ventas.ts` lines 340-362

```typescript
/** DB trigger inserts cambio_fase activity — do not duplicate in client */
export async function updateProspectoFase(
  id: string,
  fase: ProspectoFase,
  motivoDescarte?: string
): Promise<VentasResult<Prospecto>> {
  const row: Record<string, unknown> = { fase }
  if (fase === "descartado" && motivoDescarte) {
    row.motivo_descarte = motivoDescarte
  }
  // ...
}
```

**Apply:** `pipeline.validateTransition` must run **before** this call in hooks; pipeline does not call Supabase.

### `dias_en_fase` (PIPE-04)

**Source:** DB trigger `handle_dias_en_fase` in `20260617000003_create_ventas_triggers.sql`

Pipeline reads `prospecto.diasEnFase` from domain type — **do not recompute** `floor(now - fase_changed_at)` in pipeline.ts except for tests. SLA comparison: `diasEnFase` vs `slaDiasMax` from config.

### Type import from lib into `src/types/`

**Source:** `src/types/contract.ts` line 1

```typescript
import type { ContractEstado } from "../lib/contract-estado"
```

Ventas types stay in `src/lib/ventas/types.ts` (not `src/types/`) — established in Phase 1.

---

## No Analog Found

| File / concern | Role | Reason | Fallback |
|----------------|------|--------|----------|
| `pipeline.test.ts` | test | Zero `*.test.ts` in repo; no vitest | Add vitest in 02-01 or manual verification checklist |
| Explicit transition graph | validation | `contract-estado` allows any estado in `<select>` | Define `TRANSITIONS` map in pipeline.ts from PRODUCT linear flow + branches to `recontactar`/`descartado` |
| SLA day thresholds | config | Not in codebase | Product decision in discuss-phase; store in `PipelineFaseConfig.slaDiasMax` |
| `MotivoDescarte` enum | model | Only free-text `motivo_descarte` in DB | Typed union in pipeline.ts; persist `id` or `label` as text |

---

## Analog Summary Table

| Analog path | What to copy | What differs |
|-------------|--------------|--------------|
| `src/lib/contract-estado.ts` | `as const` arrays, badge switch, terminal/is* helpers, normalize optional | Snake_case fases; explicit transition map; 10 stages |
| `src/lib/ventas/types.ts` | `ProspectoFase` union, camelCase domain fields | Types only — rules go in pipeline.ts |
| `src/lib/incidencias.ts` | Union types, terminal helpers, typed motivo list pattern | No `estadoAt` client helper; 3-state vs 10-state kanban |
| `src/components/IncidenciasKanban.tsx` | Column `{ id, label, accent }`, drag-drop guards, card badge helpers | 10 columns; config exported from lib; Phase 4 component |
| `src/lib/contract-penalty.ts` | Pure functions, early guard returns | SLA urgency math |
| `src/lib/supabase/ventas.ts` | Error message tone; `updateProspectoFase` contract | Pipeline is sync validation only |
| `supabase/tests/ventas_rls.test.sql` | `supabase/tests/` location for SQL tests | Not for TS unit tests |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/lib/ventas/`, `src/components/IncidenciasKanban.tsx`, `src/App.tsx` (incidencias handlers), `supabase/tests/`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`
**Files scanned:** ~15
**Pattern extraction date:** 2026-06-17
