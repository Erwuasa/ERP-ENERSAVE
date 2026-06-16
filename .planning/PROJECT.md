# ERP EnerSave

## What This Is

ERP para una comercializadora de energía eléctrica y gas que gestiona el ciclo comercial completo: prospección, contratación, tramitación, liquidaciones e incidencias. Orientado a redes de comerciales (5–30 agentes) con jerarquía jefe → comercial y vista superadmin operativa.

Stack: React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + Supabase (PostgreSQL) + motion/react + Lucide + Sonner + React Hook Form + Zod.

## Core Value

Un comercial sabe exactamente qué hacer cada día para cerrar ventas, y cuando cierra, el contrato entra al ERP sin duplicar datos ni perder el historial del prospecto.

## Requirements

### Validated

- **CON-01**: Gestión de contratos del equipo (`ContratosPanel`) con wizard multi-paso, estados normalizados, OCR y guardado parcial
- **CON-02**: Vista de clientes por comercial (`MisClientesPanel`) con archivos y vínculo a contratos
- **CLI-01**: Upsert y sincronización de clientes desde contratos (`lib/clients.ts`)
- **MAR-01**: Catálogo Marco Retributivo filtrable (`MarcoRetributivoPanel` + `marco-retributivo-catalog.ts`)
- **INC-01**: Kanban de incidencias operativas (`IncidenciasKanban`) — pendiente/resuelta/cancelada
- **CMP-01**: Comparador de suministros con registro de contrato desde resultado
- **DB-01**: Tabla `contratos_equipo` en Supabase con insert desde wizard (`lib/supabase/contracts.ts`)
- **UI-01**: Shell ERP con roles (superadmin / jefe_comercial / comercial), tema claro/oscuro, sidebar por permisos

### Active

- [ ] **VEN-01**: Tipos y configuración de pipeline de ventas (10 fases, SLA, transiciones, descarte)
- [ ] **VEN-02**: Hooks Supabase + Realtime para prospectos, tareas y actividades
- [ ] **VEN-03**: Motor quick-wins — generación automática de tareas al cambiar fase
- [ ] **VEN-04**: Pantalla Pipeline (kanban 10 columnas, lista, filtros, drag&drop)
- [ ] **VEN-05**: Pantalla Mi Día — cola priorizada de tareas del comercial
- [ ] **VEN-06**: Ficha prospecto 360º (timeline, datos energéticos, documentos, avance de fase)
- [ ] **VEN-07**: Reporting — funnel, actividad por comercial, motivos de descarte
- [ ] **VEN-08**: Integración wizard contratos al pasar prospecto a fase `enviado`

### Out of Scope

- Auth real con Supabase Auth — login actual es simulado por email
- Persistencia completa de liquidaciones, usuarios e incidencias en BD — milestone anterior quedó en memoria
- Cashflow con datos reales — panel visual/demo
- App móvil nativa — solo web responsive
- IA generativa en ventas (scoring automático de leads) — fuera de este milestone

## Context

**Brownfield:** La mayoría del ERP vive en `App.tsx` (~5k líneas) con estado React en memoria. Módulos extraídos: `ContratosPanel`, `NuevoContratoWizard`, `MisClientesPanel`, `MarcoRetributivoPanel`, `CashflowPanel`, `IncidenciasKanban`, `ComercialCommissionsChart`.

**BD existente:** `contratos_equipo` (migración local en repo). El usuario indica que **acaban de ejecutarse** migraciones Supabase para `prospectos`, `actividades_ventas`, `tareas_ventas` con triggers `handle_updated_at`, `handle_fase_change`, `handle_dias_en_fase`. Esas migraciones aún no están en el repo local — alinear schema en fase 1.

**Entidad central ventas:** `prospectos` con pipeline de 10 fases: `prospecto_nuevo` → `contactado` → `cualificado` → `propuesta_enviada` → `negociacion` → `documentacion` → `enviado` → `cliente_activo` → `recontactar` → `descartado`. FK a `contratos_equipo` al convertir.

**Convenciones UI críticas:** `text-brand-*`, `bg-brand-panel`, `border-brand-border`, dark mode con `dark:`, motion desde `motion/react`, labels `text-[10px] font-mono uppercase`, badges `text-[9px] font-mono font-bold`, botones primarios `bg-cyan-600`, sin `any`, named exports, toasts sonner.

Repo: https://github.com/Erwuasa/ERP-ENERSAVE

## Constraints

- **Tech**: Respetar convenciones CSS y imports del proyecto (motion/react, no framer-motion)
- **Performance**: Realtime para equipos 5–30 comerciales; evitar refetch masivo en cada evento
- **Data**: Triggers DB ya registran cambios de fase en `actividades_ventas` — no duplicar lógica en cliente
- **Integration**: Conversión a contrato debe reutilizar `NuevoContratoWizard` / `handleCreateContract`, no un formulario paralelo
- **Security**: RLS en Supabase por `comercial_id` / jerarquía (definir en fase de datos)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Prospecto como entidad separada de Client/Contract | Pipeline de ventas ≠ contrato tramitado; FK al convertir | — Pending |
| Tareas generadas por quick-wins en cliente + triggers DB para actividades | Separar cola accionable vs timeline inmutable | — Pending |
| Páginas en `src/pages/ventas/` | Separar módulo ventas del monolito App.tsx gradualmente | — Pending |
| Insert contratos_equipo existente se reutiliza en fase `enviado` | Evitar duplicar datos al firmar | — Pending |

## Current Milestone: v1.0 Sistema de Ventas — Capa de datos y Pipeline Core

**Goal:** Construir el módulo de ventas end-to-end: capa de datos Supabase, hooks Realtime, motor de tareas, pantallas Pipeline / Mi Día / Ficha / Reporting, e integración con el wizard de contratos.

**Target features:**
- `src/lib/ventas/types.ts`, `pipeline.ts`, `quick-wins.ts`
- `useProspectos`, `useTareas`, `useActividades`
- `Pipeline.tsx`, `MiDia.tsx`, `FichaProspecto.tsx`, `Reporting.tsx`
- Precarga wizard + auto-creación `contratos_equipo` en fase `enviado`

**Success criteria (milestone):**
- Registrar prospecto nuevo en < 30 s
- Mi Día muestra qué hacer y en qué orden
- Cambio de fase genera tareas de seguimiento automáticas
- Manager ve actividad del equipo en Reporting sin preguntar
- Firma → contrato ERP sin duplicar datos
- Realtime funcional para 5–30 comerciales

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-17 after milestone v1.0 initialization*
