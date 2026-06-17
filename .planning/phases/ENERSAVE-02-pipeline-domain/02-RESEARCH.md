# Phase ENERSAVE-02: Pipeline Domain — Research (11 fases replan)

**Researched:** 2026-06-17
**Domain:** Sales pipeline domain logic — 11-phase schema migration, bidirectional transitions, SLA (hours + days), mandatory field validation, pure TypeScript module
**Confidence:** HIGH (REQUIREMENTS.md locked + schema/mappers verified in repo); MEDIUM (exact badge palette for 3 new fases — UI discretion)

## Summary

Phase 2 delivers **`src/lib/ventas/pipeline.ts`** plus a **DATA-05 migration** that expands `prospectos.fase` from the Phase 1 **10-value CHECK** to **11 locked values**, remaps obsolete rows (`documentacion` → `negociacion`, `enviado` → `tramitacion`, `cliente_activo` → `activado`), and adds six nullable columns with their own CHECK constraints. TypeScript in `src/lib/ventas/types.ts` and `src/lib/supabase/ventas.ts` must be updated in the same wave so domain, mappers, and DB stay aligned.

The transition model is **no longer a sparse linear graph with limited back-edges** (obsolete 10-fase research). REQUIREMENTS lock **PIPE-02 bidirectional movement** among the seven pre-activation funnel stages, with universal side exits to `con_dudas` / `descartado`, recovery via `recontactar`, and operational terminals `activado` + `descartado`. Implement transitions **programmatically** from `FUNNEL_ORDER` rather than hand-maintaining 11×11 adjacency lists — reduces drift when product reorders kanban.

SLA is **heterogeneous**: `prospecto_nuevo` uses **4 hours** (must compute from `faseChangedAt`, not `diasEnFase` — DB trigger stores whole days only `[VERIFIED: supabase/migrations/20260617000003_create_ventas_triggers.sql]`). `contactado` uses **`fecha_proximo_contacto`**. Remaining funnel phases use locked day counts. `getSlaUrgencia` accepts a `Prospecto` slice, not `(diasEnFase, fase)` alone.

PIPE-05 extends `validateTransition` beyond graph checks to enforce mandatory fields **on the target fase**. PIPE-03 locks nine `MotivoDescarte` snake_case ids. Vitest 4.1.9 is the test runner (Wave 0); co-locate `pipeline.test.ts` with transition matrix + SLA hour boundary tests.

**Primary recommendation:** Ship migration + types + mappers first, then `pipeline.ts` built from locked REQUIREMENTS tables — programmatic funnel transitions, explicit side-lane rules, unified `validateTransition(from, to, context)`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fase CHECK + column DDL | Database / Storage (migration) | — | DATA-05; Postgres enforces enum membership |
| Legacy fase row remap | Database / Storage (UPDATE) | — | Must run before new CHECK applied |
| Fase labels, colors, kanban order | Browser / Client (`pipeline.ts`) | — | PIPE-01 presentation config for Phase 4 UI |
| Bidirectional transition rules | Browser / Client (`pipeline.ts`) | — | PIPE-02; DB does not validate adjacency |
| Mandatory field validation (PIPE-05) | Browser / Client (`validateTransition`) | Database (nullable columns only) | App gate before `updateProspectoFase` |
| `motivo_descarte` enum validation | Browser / Client (`pipeline.ts`) | — | PIPE-03; persisted as text |
| `dias_en_fase` counter | Database / Storage (`handle_dias_en_fase`) | Browser (read + SLA for day-based fases) | PIPE-04; trigger uses floor(epoch/86400) |
| 4-hour SLA for `prospecto_nuevo` | Browser / Client (`getSlaUrgencia`) | — | Hours precision unavailable in `dias_en_fase` |
| `fecha_proximo_contacto` SLA | Browser / Client (`getSlaUrgencia`) | — | Custom date SLA for `contactado` |
| Fase change audit | Database / Storage (`handle_fase_change`) | — | Client must not duplicate |
| Persist fase + new columns | Browser / Client (`ventas.ts`) | Database (triggers) | Phase 3 hooks call after validation |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-05 | ALTER CHECK `fase` → 11 values; remap legacy fases; add 6 columns | Migration strategy §DATA-05; types + mapper updates |
| PIPE-01 | 11 fases with labels, colors, kanban order, terminals | `PIPELINE_FASE_CONFIG`, `PIPELINE_KANBAN_COLUMNS`, `isTerminalFase` |
| PIPE-02 | Bidirectional transitions validated before persist | `FUNNEL_ORDER` builder + side-lane rules + `validateTransition` |
| PIPE-03 | SLA per fase + 9 motivos descarte tipados | `slaHorasMax` / `slaDiasMax` + `MOTIVOS_DESCARTE` |
| PIPE-04 | `dias_en_fase` from BD for day SLAs | Read `prospecto.diasEnFase`; hour/custom-date paths in `getSlaUrgencia` |
| PIPE-05 | Mandatory fields per fase on transition | `validateTransition` context + error codes |
| PIPE-06 | `subtipo_prospecto` enum; max priority all subtypes in `prospecto_nuevo` | `SUBTIPO_PROSPECTO` + `isSubtipoPrioridadMaxima` |
</phase_requirements>

<user_constraints>
## User Constraints (from REQUIREMENTS.md — locked 2026-06-17; no CONTEXT.md)

### Locked Decisions

- **11 fases** kanban order: `prospecto_nuevo` → `contactado` → `cualificado` → `propuesta_enviada` → `negociacion` → `tramitacion` → `pendiente_firma` → `activado` → `con_dudas` → `descartado` → `recontactar`
- **Eliminadas:** `documentacion` (absorbida por `negociacion`), `enviado` → `tramitacion`, `cliente_activo` → `activado`
- **Nueva fase:** `con_dudas`
- **Transiciones bidireccionales** entre fases activas del funnel; desde cualquier fase activa → `con_dudas` \| `descartado`; desde `con_dudas` \| `descartado` → `recontactar`; desde `recontactar` → cualquier fase activa (incl. `prospecto_nuevo` / `contactado`)
- **Terminales operativos:** `activado` (SLA seguimiento 30 días), `descartado` (motivo obligatorio)
- **SLA locked:** `prospecto_nuevo` **4 h**; `cualificado` 3 d; `propuesta_enviada` 2 d; `negociacion` 2 d; `tramitacion` 5 d; `pendiente_firma` 2 d; `activado` 30 d; `contactado` personalizado (`fecha_proximo_contacto`); sin SLA en `con_dudas`, `descartado`, `recontactar`
- **PIPE-05 campos obligatorios:** `subtipo_prospecto` (`prospecto_nuevo`); `fecha_proximo_contacto` (`contactado`); `motivo_con_dudas` (`con_dudas`); `motivo_descarte` (`descartado`); `sub_estado` (`tramitacion`); `motivo_recontacto` + `fecha_recontactar` (`recontactar`)
- **Motivos descarte (9):** `precio_competencia`, `no_interesado`, `permanencia_activa`, `no_es_decisor`, `moroso`, `sin_respuesta`, `consumo_bajo`, `ya_es_cliente`, `otro`
- **`sub_estado` (`tramitacion`):** `en_proceso`, `incidencia_administrativa`, `pendiente_de_firma`
- **`subtipo_prospecto`:** `base_datos`, `vecino_zona`, `contacto_previo`, `referido` — todos prioridad máxima (PIPE-06)
- `ProspectoFase` union in `types.ts` — pipeline imports, does not re-declare values
- DB triggers own `cambio_fase` — pipeline does not write timeline rows
- Spanish user-facing validation messages; named exports; no `any`

### Claude's Discretion

- Exact Tailwind badge/column accent for `tramitacion`, `pendiente_firma`, `con_dudas` (extend existing slate→emerald progression)
- Vitest: extend `vite.config.ts` inline vs dedicated `vitest.config.ts` (prefer inline — repo has single vite config)
- Whether `validateTransition` clears obsolete fields when leaving a fase (e.g. clear `sub_estado` leaving `tramitacion`) — recommend clear-on-exit in Phase 3 hook, not Phase 2
- Default `sub_estado = 'en_proceso'` for migrated `tramitacion` rows only vs all new tramitacion transitions

### Deferred Ideas (OUT OF SCOPE)

- Quick-wins task engine (Phase 3)
- Pipeline kanban UI / drag&drop (Phase 4)
- Hooks Realtime (Phase 3)
- `updateProspectoFase` persisting all PIPE-05 fields (Phase 3 — Phase 2 defines validation contract)
- DB CHECK on transition adjacency
- pg_cron midnight refresh of `dias_en_fase`
- Terminal kanban fade-out (incidencias pattern)
</user_constraints>

## Project Constraints (from .cursor/rules/)

No `.cursor/rules/` directory in repo. Apply project conventions from `PROJECT.md` and user rules:

- TypeScript functional style; named exports; interfaces for domain types
- Phase 2 scope: migration DATA-05 + `types.ts` + `pipeline.ts` + vitest — no UI
- Badge styling mirrors `contract-estado.ts` (`dark:` pairs, `text-[9px] font-mono font-bold` for SLA badges)
- Minimize scope — do not refactor unrelated ERP modules

---

## DATA-05 Migration Strategy

**Source schema:** `supabase/migrations/20260617000002_create_ventas_core.sql` lines 14–26 — 10-value inline CHECK including obsolete `documentacion`, `enviado`, `cliente_activo` `[VERIFIED: repo]`.

**New migration file (recommended):** `supabase/migrations/20260617000005_alter_prospectos_pipeline_11_fases.sql`

### Execution order (critical)

PostgreSQL rejects UPDATEs that violate CHECK if constraint still active. **Drop CHECK → remap data → add columns → add new CHECKs.**

```sql
-- 1) Drop inline fase CHECK (auto-name prospectos_fase_check)
ALTER TABLE public.prospectos
  DROP CONSTRAINT IF EXISTS prospectos_fase_check;

-- 2) Remap legacy fase values (locked mapping)
UPDATE public.prospectos SET fase = 'negociacion'  WHERE fase = 'documentacion';
UPDATE public.prospectos SET fase = 'tramitacion' WHERE fase = 'enviado';
UPDATE public.prospectos SET fase = 'activado'    WHERE fase = 'cliente_activo';

-- 3) Add new nullable columns
ALTER TABLE public.prospectos
  ADD COLUMN IF NOT EXISTS subtipo_prospecto text,
  ADD COLUMN IF NOT EXISTS fecha_proximo_contacto timestamptz,
  ADD COLUMN IF NOT EXISTS sub_estado text,
  ADD COLUMN IF NOT EXISTS motivo_con_dudas text,
  ADD COLUMN IF NOT EXISTS motivo_recontacto text,
  ADD COLUMN IF NOT EXISTS fecha_recontactar timestamptz;

-- 4) Backfill tramitacion sub_estado for migrated rows
UPDATE public.prospectos
SET sub_estado = 'en_proceso'
WHERE fase = 'tramitacion' AND sub_estado IS NULL;

-- 5) Column-level CHECK constraints (nullable — PIPE-05 enforced in app on transition)
ALTER TABLE public.prospectos
  ADD CONSTRAINT prospectos_fase_check CHECK (
    fase IN (
      'prospecto_nuevo', 'contactado', 'cualificado', 'propuesta_enviada',
      'negociacion', 'tramitacion', 'pendiente_firma', 'activado',
      'con_dudas', 'descartado', 'recontactar'
    )
  );

ALTER TABLE public.prospectos
  ADD CONSTRAINT prospectos_subtipo_prospecto_check CHECK (
    subtipo_prospecto IS NULL OR subtipo_prospecto IN (
      'base_datos', 'vecino_zona', 'contacto_previo', 'referido'
    )
  );

ALTER TABLE public.prospectos
  ADD CONSTRAINT prospectos_sub_estado_check CHECK (
    sub_estado IS NULL OR sub_estado IN (
      'en_proceso', 'incidencia_administrativa', 'pendiente_de_firma'
    )
  );

-- motivo_descarte remains free text at DB level; enum validated in pipeline.ts (PIPE-03)
COMMENT ON COLUMN public.prospectos.subtipo_prospecto IS 'Required in fase prospecto_nuevo (PIPE-05)';
COMMENT ON COLUMN public.prospectos.sub_estado IS 'Required in fase tramitacion (PIPE-05)';
```

### Remap rationale (locked — not negotiable)

| Legacy `fase` | New `fase` | Rationale |
|---------------|------------|-----------|
| `documentacion` | `negociacion` | Documentación absorbida por negociación |
| `enviado` | `tramitacion` | Tramitación reemplaza enviado; set `sub_estado` default |
| `cliente_activo` | `activado` | Rename only; SLA seguimiento 30 d |

**No automatic remap to `pendiente_firma` or `con_dudas`** — those are new business states; legacy data has no source column.

### TypeScript / mapper follow-up (same phase wave)

Update in `src/lib/ventas/types.ts` and `src/lib/supabase/ventas.ts`:

- `ProspectoRow` + `mapProspectoRow` / `buildProspectoInsert` / `buildProspectoUpdate` for six new snake_case columns
- `updateProspectoFase` signature expansion (Phase 2 defines types; Phase 3 hook passes full context):

```typescript
export interface UpdateProspectoFaseInput {
  fase: ProspectoFase
  motivoDescarte?: MotivoDescarte
  subtipoProspecto?: SubtipoProspecto
  fechaProximoContacto?: string
  subEstado?: SubEstadoTramitacion
  motivoConDudas?: string
  motivoRecontacto?: string
  fechaRecontactar?: string
}
```

---

## Transition Graph — 11 Fases, Bidirectional (PIPE-02)

### Tier definitions

| Tier | Fases | Outbound rule |
|------|-------|---------------|
| **Funnel active** | `prospecto_nuevo` … `pendiente_firma` (7) | Adjacent ±1 in funnel + `con_dudas` + `descartado` + forward to `activado` from `pendiente_firma` only |
| **Operational terminal** | `activado` | None (SLA seguimiento only) |
| **Exit terminal** | `descartado` | `recontactar` only |
| **Side lane** | `con_dudas` | `recontactar` only |
| **Recovery** | `recontactar` | All funnel active fases + `con_dudas` + `descartado` |

**`FUNNEL_ORDER` (locked kanban 1–8):**

```typescript
export const FUNNEL_ORDER = [
  "prospecto_nuevo",
  "contactado",
  "cualificado",
  "propuesta_enviada",
  "negociacion",
  "tramitacion",
  "pendiente_firma",
  "activado",
] as const satisfies readonly ProspectoFase[]

export const FUNNEL_ACTIVE = FUNNEL_ORDER.slice(0, -1) // excludes activado
```

### Programmatic `buildTransitions()` (recommended)

```typescript
function transitionsForFunnelActive(fase: ProspectoFase): ProspectoFase[] {
  const idx = FUNNEL_ACTIVE.indexOf(fase as (typeof FUNNEL_ACTIVE)[number])
  if (idx === -1) return []
  const targets = new Set<ProspectoFase>(["con_dudas", "descartado"])
  if (idx > 0) targets.add(FUNNEL_ACTIVE[idx - 1]!)
  if (idx < FUNNEL_ACTIVE.length - 1) targets.add(FUNNEL_ACTIVE[idx + 1]!)
  if (fase === "pendiente_firma") targets.add("activado")
  return [...targets]
}

export const TRANSITIONS: Record<ProspectoFase, readonly ProspectoFase[]> =
  Object.fromEntries(
    ([...FUNNEL_ACTIVE].map((f) => [f, transitionsForFunnelActive(f)] as const))
      .concat([
        ["activado", []],
        ["con_dudas", ["recontactar"]],
        ["descartado", ["recontactar"]],
        ["recontactar", [...FUNNEL_ACTIVE, "con_dudas", "descartado"]],
      ])
  ) as Record<ProspectoFase, readonly ProspectoFase[]>
```

`canTransition(from, to)` → `from !== to && TRANSITIONS[from].includes(to)`.

**Diff vs obsolete 10-fase graph:** No separate `documentacion` / `enviado` nodes; backward moves are **adjacent-only** across full funnel (not limited 3-edge list); `recontactar` may return to **any** funnel active fase, not only `contactado`.

### ASCII diagram

```
[prospecto_nuevo] <-> [contactado] <-> ... <-> [pendiente_firma] -> [activado]
        |    \___________|_______________ ... ___________|________/
        v                v                                  v
   [con_dudas]      [descartado] <-----------------> [recontactar]
        |                |
        +-------> [recontactar] <-------+
```

---

## SLA Configuration (PIPE-03 / PIPE-04)

### Locked SLA table

| Fase | SLA | Config field | Comparison input |
|------|-----|--------------|------------------|
| `prospecto_nuevo` | **4 hours** | `slaHorasMax: 4` | `faseChangedAt` → hours elapsed |
| `contactado` | Personalizado | `slaUsesFechaProximoContacto: true` | `fechaProximoContacto` vs now |
| `cualificado` | 3 days | `slaDiasMax: 3` | `diasEnFase` |
| `propuesta_enviada` | 2 days | `slaDiasMax: 2` | `diasEnFase` |
| `negociacion` | 2 days | `slaDiasMax: 2` | `diasEnFase` |
| `tramitacion` | 5 days | `slaDiasMax: 5` | `diasEnFase` |
| `pendiente_firma` | 2 days | `slaDiasMax: 2` | `diasEnFase` |
| `activado` | 30 days | `slaDiasMax: 30` | `diasEnFase` |
| `con_dudas` | — | `null` | `"na"` |
| `descartado` | — | `null` | `"na"` |
| `recontactar` | — | `null` | `"na"` |

### `getSlaUrgencia` implementation

**Do not use `diasEnFase` alone for `prospecto_nuevo`.** Trigger `handle_dias_en_fase` computes `floor(epoch/86400)` — stays `0` until 24 h elapsed `[VERIFIED: 20260617000003_create_ventas_triggers.sql:59-61]`.

```typescript
export type SlaUrgencia = "ok" | "warning" | "breach" | "na"

export interface SlaInput {
  fase: ProspectoFase
  faseChangedAt: string
  diasEnFase: number
  fechaProximoContacto?: string
}

const WARNING_RATIO = 0.8

export function getSlaUrgencia(
  input: SlaInput,
  referenceDate: Date = new Date()
): SlaUrgencia {
  const config = getFaseConfig(input.fase)

  if (config.slaHorasMax != null) {
    const hours =
      (referenceDate.getTime() - new Date(input.faseChangedAt).getTime()) / 3_600_000
    if (hours >= config.slaHorasMax) return "breach"
    if (hours >= config.slaHorasMax * WARNING_RATIO) return "warning"
    return "ok"
  }

  if (config.slaUsesFechaProximoContacto) {
    if (!input.fechaProximoContacto) return "warning" // PIPE-05 should block; defensive
    const target = new Date(input.fechaProximoContacto).getTime()
    const now = referenceDate.getTime()
    if (now > target) return "breach"
    const windowMs = target - new Date(input.faseChangedAt).getTime()
    if (windowMs > 0 && now >= target - windowMs * (1 - WARNING_RATIO)) return "warning"
    return "ok"
  }

  const max = config.slaDiasMax
  if (max == null) return "na"
  if (input.diasEnFase >= max) return "breach"
  if (input.diasEnFase >= Math.ceil(max * WARNING_RATIO)) return "warning"
  return "ok"
}
```

### PIPE-06 subtipo priority

All four subtipos → **prioridad máxima** in `prospecto_nuevo`:

```typescript
export function isSubtipoPrioridadMaxima(_subtipo: SubtipoProspecto): boolean {
  return true // locked: all subtypes max priority
}
```

Expose for Phase 5 Mi Día sort — no branching on subtipo value in v1.0.

---

## PIPE-05 Mandatory Field Validation

Validate **target fase** after graph check passes:

| Target fase | Required context fields | Error code |
|-------------|-------------------------|------------|
| `prospecto_nuevo` | `subtipoProspecto` | `subtipo_required` |
| `contactado` | `fechaProximoContacto` (ISO timestamptz) | `fecha_contacto_required` |
| `tramitacion` | `subEstado` | `sub_estado_required` |
| `con_dudas` | `motivoConDudas` (non-empty trim) | `motivo_dudas_required` |
| `descartado` | `motivoDescarte` (valid enum) | `motivo_required` / `invalid_motivo` |
| `recontactar` | `motivoRecontacto` + `fechaRecontactar` | `motivo_recontacto_required` / `fecha_recontactar_required` |

```typescript
export interface TransitionContext {
  motivoDescarte?: MotivoDescarte
  subtipoProspecto?: SubtipoProspecto
  fechaProximoContacto?: string
  subEstado?: SubEstadoTramitacion
  motivoConDudas?: string
  motivoRecontacto?: string
  fechaRecontactar?: string
}

export function validateTransition(
  from: ProspectoFase,
  to: ProspectoFase,
  context?: TransitionContext
): TransitionValidationResult
```

**Validation order:** (1) `same_fase` (2) `invalid_transition` (3) PIPE-05 per target fase (4) `invalid_motivo` if descarte id unknown.

Spanish messages (examples): `"Indica el subtipo de prospecto"`, `"Indica la fecha del próximo contacto"`, `"Indica el sub-estado de tramitación"`, `"Indica el motivo de dudas"`, `"Indica el motivo de descarte"`, `"Indica el motivo y la fecha de recontacto"`.

---

## Motivos de Descarte (PIPE-03) — 9 values locked

```typescript
export type MotivoDescarte =
  | "precio_competencia"
  | "no_interesado"
  | "permanencia_activa"
  | "no_es_decisor"
  | "moroso"
  | "sin_respuesta"
  | "consumo_bajo"
  | "ya_es_cliente"
  | "otro"

export const MOTIVOS_DESCARTE: readonly { id: MotivoDescarte; label: string }[] = [
  { id: "precio_competencia", label: "Precio / competencia" },
  { id: "no_interesado", label: "No interesado" },
  { id: "permanencia_activa", label: "Permanencia activa" },
  { id: "no_es_decisor", label: "No es decisor" },
  { id: "moroso", label: "Moroso" },
  { id: "sin_respuesta", label: "Sin respuesta" },
  { id: "consumo_bajo", label: "Consumo bajo" },
  { id: "ya_es_cliente", label: "Ya es cliente" },
  { id: "otro", label: "Otro" },
] as const

export function isMotivoDescarte(value: string): value is MotivoDescarte {
  return MOTIVOS_DESCARTE.some((m) => m.id === value)
}
```

**Obsolete:** prior research listed 10 different ids (`precio_no_competitivo`, etc.) — **do not use**.

---

## Sub-estado Tramitación & Subtipo Prospecto

```typescript
export type SubEstadoTramitacion =
  | "en_proceso"
  | "incidencia_administrativa"
  | "pendiente_de_firma"

export const SUB_ESTADOS_TRAMITACION: readonly {
  id: SubEstadoTramitacion
  label: string
}[] = [
  { id: "en_proceso", label: "En proceso" },
  { id: "incidencia_administrativa", label: "Incidencia administrativa" },
  { id: "pendiente_de_firma", label: "Pendiente de firma" },
]

export type SubtipoProspecto =
  | "base_datos"
  | "vecino_zona"
  | "contacto_previo"
  | "referido"

export const SUBTIPOS_PROSPECTO: readonly {
  id: SubtipoProspecto
  label: string
}[] = [
  { id: "base_datos", label: "Base de datos" },
  { id: "vecino_zona", label: "Vecino de zona" },
  { id: "contacto_previo", label: "Contacto previo" },
  { id: "referido", label: "Referido" },
]
```

Align labels with `contract-estado.ts` pattern — display strings in pipeline config, ids persisted to DB.

---

## `types.ts` Updates (DATA-03 / DATA-05)

Replace `ProspectoFase` union — remove `documentacion`, `enviado`, `cliente_activo`; add `tramitacion`, `pendiente_firma`, `activado`, `con_dudas`.

```typescript
export type ProspectoFase =
  | "prospecto_nuevo"
  | "contactado"
  | "cualificado"
  | "propuesta_enviada"
  | "negociacion"
  | "tramitacion"
  | "pendiente_firma"
  | "activado"
  | "con_dudas"
  | "descartado"
  | "recontactar"

export interface Prospecto {
  // ... existing fields ...
  fase: ProspectoFase
  subtipoProspecto?: SubtipoProspecto
  fechaProximoContacto?: string
  subEstado?: SubEstadoTramitacion
  motivoConDudas?: string
  motivoRecontacto?: string
  fechaRecontactar?: string
  motivoDescarte?: MotivoDescarte // narrow from string
}
```

Extend `CreateProspectoInput`, `UpdateProspectoPatch` with optional new fields. Export enums from `types.ts`; re-export convenience arrays from `pipeline.ts` only where UI needs config bundles.

**Grep cleanup:** Phase 2 plan must search repo for `documentacion`, `enviado`, `cliente_activo` string literals after types change.

---

## Kanban Config (PIPE-01) — 11 columns

| Order | Fase | Label | Terminal | sla |
|------:|------|-------|----------|-----|
| 1 | `prospecto_nuevo` | Prospecto nuevo | | 4 h |
| 2 | `contactado` | Contactado | | custom |
| 3 | `cualificado` | Cualificado | | 3 d |
| 4 | `propuesta_enviada` | Propuesta enviada | | 2 d |
| 5 | `negociacion` | Negociación | | 2 d |
| 6 | `tramitacion` | Tramitación | | 5 d |
| 7 | `pendiente_firma` | Pendiente firma | | 2 d |
| 8 | `activado` | Activado | yes | 30 d |
| 9 | `con_dudas` | Con dudas | | — |
| 10 | `descartado` | Descartado | yes | — |
| 11 | `recontactar` | Recontactar | | — |

```typescript
export interface PipelineFaseConfig {
  id: ProspectoFase
  label: string
  kanbanOrder: number
  columnAccent: string
  badgeClass: string
  slaHorasMax: number | null
  slaDiasMax: number | null
  slaUsesFechaProximoContacto: boolean
  isTerminal: boolean
}

export function isTerminalFase(fase: ProspectoFase): boolean {
  return fase === "activado" || fase === "descartado"
}
```

Badge/column accents: reuse PATTERNS.md progression; insert violet/indigo/teal for new middle fases — exact classes are planner discretion.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.2 (repo) | Domain + migration types | Project standard `[VERIFIED: package.json]` |
| Vite | ^6.2.3 | Test runner host | Existing bundler `[VERIFIED: package.json]` |
| Vitest | 4.1.9 | Unit tests for pure pipeline | Native Vite integration `[CITED: vitest.dev/guide/]` |
| `src/lib/ventas/types.ts` | Phase 1 + DATA-05 | Single fase union source | DATA-03 |

**No new runtime dependencies.**

```bash
npm install -D vitest@4.1.9
```

Extend `vite.config.ts`:

```typescript
/// <reference types="vitest/config" />
export default defineConfig({
  // ...existing plugins...
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
```

Add script: `"test": "vitest run"`, `"test:watch": "vitest"`.

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| vitest | npm | 4.1.9 (2026-06-15) | ~70M/wk | github.com/vitest-dev/vitest | SUS (too-new flag) | **Approved** — official Vitest monorepo; seam flags release age, not typosquat |

**Packages removed due to SLOP verdict:** none

**Packages flagged SUS:** vitest — planner may add `checkpoint:human-verify` before install; postinstall script **none** `[VERIFIED: npm view vitest scripts.postinstall]`

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────┐     validateTransition      ┌──────────────────┐
│  Phase 4 UI /   │ ──────────────────────────► │  pipeline.ts     │
│  Phase 3 hooks  │     (graph + PIPE-05)       │  (pure domain)   │
└────────┬────────┘                             └────────▲─────────┘
         │ on success                                      │ reads
         v                                                 │
┌─────────────────┐     map row ↔ domain        ┌────────┴─────────┐
│  ventas.ts      │ ◄────────────────────────── │  types.ts        │
│  updateFase     │                             │  ProspectoFase   │
└────────┬────────┘                             └──────────────────┘
         │ PATCH fase + columns
         v
┌─────────────────┐     triggers                ┌──────────────────┐
│  prospectos     │ ──────────────────────────► │ actividades_     │
│  (Postgres)     │  handle_fase_change,        │ ventas timeline  │
│  11 fase CHECK  │  handle_dias_en_fase        │                  │
└─────────────────┘                             └──────────────────┘
```

### Recommended project structure

```
src/lib/ventas/
├── types.ts              # unions + Prospecto (+ DATA-05 fields)
├── pipeline.ts           # config, transitions, SLA, validation
└── pipeline.test.ts      # vitest — matrix + SLA hour boundary

supabase/migrations/
└── 20260617000005_alter_prospectos_pipeline_11_fases.sql
```

### Pattern: mirror `contract-estado.ts`

**What:** `as const` arrays, badge switch, terminal predicates, Spanish-facing errors.

**Example:**

```typescript
// Source: src/lib/contract-estado.ts
export const CONTRACT_ESTADOS = [ /* ... */ ] as const
export type ContractEstado = (typeof CONTRACT_ESTADOS)[number]
export function isContractTerminal(estado: string): boolean { /* ... */ }
```

**Apply:** `getProspectoFaseBadgeClass`, `isTerminalFase`, `MOTIVOS_DESCARTE` — same export style.

### Anti-Patterns to Avoid

- **Hand-maintaining 11×N adjacency lists** — use `FUNNEL_ORDER` builder; side lanes explicit only
- **Using `diasEnFase` for 4-hour SLA** — always `faseChangedAt` for `prospecto_nuevo`
- **Duplicating `ProspectoFase` in pipeline.ts** — import from `types.ts`
- **Inserting `cambio_fase` activities client-side** — DB trigger owns audit trail

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fase enum sync | String literals scattered | `ProspectoFase` + DB CHECK | Drift breaks mappers |
| Transition rules in UI | Per-component adjacency | `pipeline.canTransition` | Single test matrix |
| SLA urgency math | Ad-hoc date diffs in components | `getSlaUrgencia(SlaInput)` | Hours vs days vs custom date |
| Motivo descarte list | Free-text only | `MOTIVOS_DESCARTE` const | PIPE-03 + reporting aggregation |
| Days in fase | Client `floor(now - changed)` | DB `dias_en_fase` for day SLAs | Trigger already canonical |

---

## Common Pitfalls

### Pitfall 1: CHECK constraint before data remap

**What goes wrong:** Migration fails or leaves rows in invalid state.

**Why:** Old values still present when new CHECK applied.

**How to avoid:** DROP CHECK → UPDATE legacy fases → ADD CHECK.

**Warning signs:** `23514: check constraint "prospectos_fase_check" violated`

### Pitfall 2: 4-hour SLA always shows "ok" with `diasEnFase === 0`

**What goes wrong:** Mi Día / Pipeline show green for stale `prospecto_nuevo` > 4 h.

**Why:** Trigger granularity is whole days.

**How to avoid:** `getSlaUrgencia` hour branch using `faseChangedAt`.

**Warning signs:** Unit test `hours=3.9 → ok`, `hours=4 → breach` fails if using dias.

### Pitfall 3: Obsolete 10-fase plans / tests

**What goes wrong:** `pipeline.test.ts` asserts `documentacion` transitions.

**Why:** Old RESEARCH/plans not replanned.

**How to avoid:** Delete references to removed fases; 11 fase config count assertion.

### Pitfall 4: `validateTransition` only checks descarte motivo

**What goes wrong:** Rows persist without `sub_estado`, `fecha_proximo_contacto`, etc.

**Why:** Old signature `motivoDescarte?` only.

**How to avoid:** Full `TransitionContext` + PIPE-05 table.

### Pitfall 5: Mapper drift after migration

**What goes wrong:** New columns always `undefined` in UI.

**Why:** `ProspectoRow` / `mapProspectoRow` not updated.

**How to avoid:** Same PR wave as migration + types.

---

## Code Examples

### Vitest — transition + SLA hour boundary

```typescript
// Source: vitest.dev/api/#test-api
import { describe, expect, it } from "vitest"
import { canTransition, getSlaUrgencia, validateTransition } from "./pipeline"

describe("11-phase transitions", () => {
  it("allows bidirectional adjacent funnel moves", () => {
    expect(canTransition("negociacion", "propuesta_enviada")).toBe(true)
    expect(canTransition("negociacion", "tramitacion")).toBe(true)
  })

  it("blocks skip-ahead two stages", () => {
    expect(canTransition("prospecto_nuevo", "cualificado")).toBe(false)
  })

  it("requires sub_estado entering tramitacion", () => {
    const r = validateTransition("negociacion", "tramitacion", {})
    expect(r.ok).toBe(false)
  })
})

describe("getSlaUrgencia prospecto_nuevo 4h", () => {
  it("breaches at 4 hours", () => {
    const changed = new Date(Date.now() - 4 * 3_600_000).toISOString()
    expect(
      getSlaUrgencia({ fase: "prospecto_nuevo", faseChangedAt: changed, diasEnFase: 0 })
    ).toBe("breach")
  })
})
```

### Migration remap block

```sql
-- Source: REQUIREMENTS.md DATA-05 locked mapping
UPDATE public.prospectos SET fase = 'negociacion'  WHERE fase = 'documentacion';
UPDATE public.prospectos SET fase = 'tramitacion' WHERE fase = 'enviado';
UPDATE public.prospectos SET fase = 'activado'    WHERE fase = 'cliente_activo';
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 10 fases incl. `documentacion`, `enviado`, `cliente_activo` | 11 fases; docs in `negociacion`; `tramitacion` + `pendiente_firma` + `con_dudas` | 2026-06-17 REQUIREMENTS lock | Obsolete RESEARCH/plans invalid |
| Sparse back-edges only | Full adjacent bidirectional funnel | 2026-06-17 PIPE-02 lock | Programmatic builder |
| SLA all days (`slaDiasMax`) | 4 h + custom date + days | 2026-06-17 lock | `getSlaUrgencia` signature change |
| 10 motivos descarte (old research) | 9 locked PIPE-03 ids | 2026-06-17 | Replace enum entirely |
| No vitest | vitest co-located tests | Phase 2 Wave 0 | `pipeline.test.ts` |

**Deprecated/outdated:**

- `.planning/phases/ENERSAVE-02-pipeline-domain/02-01-PLAN.md` references 10 fases — **must replan**
- `PATTERNS.md` terminal `cliente_activo` — update to `activado`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `recontactar` may target `con_dudas`/`descartado` again | Transitions | Extra targets harmless; omit if product forbids |
| A2 | `activado` has zero outbound transitions | Transitions | If product allows → activado, add edges |
| A3 | Warning threshold 80% for all SLA types | SLA | UI urgency density — adjustable constant |

**Note:** SLA values, remap table, motivo ids, and bidirectional funnel are **locked in REQUIREMENTS** — not assumptions.

---

## Open Questions

1. **~~SLA day defaults per fase?~~** → **RESOLVED:** Locked in REQUIREMENTS.md table (3/2/2/5/2/30 d + 4 h + custom).
2. **~~Backward transitions allowed?~~** → **RESOLVED:** PIPE-02 bidirectional among funnel active fases (adjacent ±1).
3. **~~Motivo descarte enum values?~~** → **RESOLVED:** 9 PIPE-03 ids locked.
4. **~~Legacy fase migration mapping?~~** → **RESOLVED:** `documentacion→negociacion`, `enviado→tramitacion`, `cliente_activo→activado`.
5. **~~Terminal fases?~~** → **RESOLVED:** `activado` + `descartado`; `descartado` may → `recontactar` only.
6. **~~New columns list?~~** → **RESOLVED:** DATA-05 six columns locked.

**Remaining discretion (non-blocking):** badge hex for 3 new fases; default `sub_estado` on manual tramitacion entry.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest / vite | ✓ | (host) | — |
| npm | install vitest | ✓ | — | — |
| Supabase CLI | apply DATA-05 migration | ✓ `[ASSUMED]` | — | Manual SQL in dashboard |
| PostgreSQL | prospectos CHECK | ✓ via Supabase | — | — |

**Missing dependencies with no fallback:** none for Phase 2 domain work.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (to install Wave 0) |
| Config file | `vite.config.ts` — `test` block |
| Quick run command | `npm run test -- src/lib/ventas/pipeline.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-05 | Legacy fase union removed from types | compile | `npm run lint` | ❌ Wave 0 types update |
| PIPE-01 | 11 fases config + kanban order | unit | `npm run test -- pipeline.test.ts -t "PIPELINE_FASE_CONFIG"` | ❌ Wave 0 |
| PIPE-02 | Bidirectional adjacent + side lanes | unit | `npm run test -- pipeline.test.ts -t "transitions"` | ❌ Wave 0 |
| PIPE-03 | 9 motivos + SLA constants | unit | `npm run test -- pipeline.test.ts -t "MOTIVOS\|SLA"` | ❌ Wave 0 |
| PIPE-04 | Day SLA uses diasEnFase | unit | `npm run test -- pipeline.test.ts -t "dias SLA"` | ❌ Wave 0 |
| PIPE-05 | Mandatory fields per target fase | unit | `npm run test -- pipeline.test.ts -t "PIPE-05"` | ❌ Wave 0 |
| PIPE-06 | All subtipos max priority | unit | `npm run test -- pipeline.test.ts -t "subtipo"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test -- src/lib/ventas/pipeline.test.ts`
- **Per wave merge:** `npm run test`
- **Phase gate:** `npm run lint && npm run test` green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest` devDependency + `vite.config.ts` test block + npm scripts
- [ ] `src/lib/ventas/pipeline.ts` — does not exist yet
- [ ] `src/lib/ventas/pipeline.test.ts` — does not exist yet
- [ ] `supabase/migrations/20260617000005_alter_prospectos_pipeline_11_fases.sql`
- [ ] `types.ts` + `ventas.ts` mapper updates for 11 fases + 6 columns

### `pipeline.test.ts` strategy (recommended suites)

1. **config** — `PIPELINE_FASE_CONFIG` length 11; kanbanOrder 1..11 unique; terminals only `activado`/`descartado`
2. **transitions** — parameterized pairs: all `FUNNEL_ACTIVE` adjacent ±1; `pendiente_firma→activado`; any active → `con_dudas`/`descartado`; `con_dudas|descartado→recontactar`; `recontactar→` each `FUNNEL_ACTIVE`; forbidden skip-ahead; `activado→*` false
3. **PIPE-05** — each target fase missing field → `{ ok: false }` with expected code
4. **SLA** — `prospecto_nuevo` hour math; day fases with `diasEnFase`; `contactado` with/without `fechaProximoContacto`; `con_dudas` → `na`
5. **motivos** — exactly 9 ids; `isMotivoDescarte` true/false

Use `it.each` tables — avoid 100+ duplicate tests.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Phase 2 domain only |
| V3 Session Management | no | — |
| V4 Access Control | no | RLS Phase 1 |
| V5 Input Validation | yes | `validateTransition` + enum guards; optional Zod wrapper in Phase 3 |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Invalid fase injection via API | Tampering | Supabase CHECK + client validation before PATCH |
| Free-text motivo bypass reporting | Tampering | `isMotivoDescarte` enum gate |
| SQL injection in migration | Tampering | Parameterized migrations only; static SQL |

---

## Sources

### Primary (HIGH confidence)

- `.planning/REQUIREMENTS.md` — 11 fases, DATA-05, PIPE-01–06 locked 2026-06-17
- `supabase/migrations/20260617000002_create_ventas_core.sql` — baseline 10 fase CHECK
- `supabase/migrations/20260617000003_create_ventas_triggers.sql` — `dias_en_fase` day granularity
- `src/lib/ventas/types.ts`, `src/lib/supabase/ventas.ts` — current domain + mappers
- `src/lib/contract-estado.ts` — domain module pattern

### Secondary (MEDIUM confidence)

- `.planning/phases/ENERSAVE-02-pipeline-domain/PATTERNS.md` — file layout (update terminal names)
- vitest.dev — Vite-integrated test runner `[CITED: vitest.dev/guide/]`

### Tertiary (LOW confidence)

- Badge colors for 3 new fases — planner discretion

---

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — repo versions verified; vitest official
- Architecture: **HIGH** — REQUIREMENTS lock + schema verified
- Pitfalls: **HIGH** — CHECK order + hour SLA derived from trigger source

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stable domain); re-research if REQUIREMENTS pipeline table changes

---

## RESEARCH COMPLETE

**Phase:** ENERSAVE-02 — Pipeline Domain (11 fases replan)
**Confidence:** HIGH

### Key Findings

- DATA-05 requires DROP CHECK → remap 3 legacy fases → add 6 columns → new 11-value CHECK
- PIPE-02 bidirectional funnel is best implemented via `FUNNEL_ORDER` programmatic builder, not static 10-fase graph
- `prospecto_nuevo` 4 h SLA **must** use `faseChangedAt`; `dias_en_fase` is day-granular only
- PIPE-05 expands validation to six field groups on target fase; signature needs `TransitionContext`
- Obsolete 10-fase RESEARCH, plans, and motivo enum must not be reused

### File Created

`.planning/phases/ENERSAVE-02-pipeline-domain/02-RESEARCH.md`

### Ready for Planning

Research complete. Planner must replan 02-01/02-02 for 11 fases, DATA-05 migration, and expanded test matrix.
