# Roadmap: ERP EnerSave — Milestone v1.0

## Overview

Este milestone construye el **Sistema de Ventas** sobre el ERP brownfield existente. Empieza alineando schema Supabase y tipos, define la lógica de pipeline y quick-wins, implementa hooks con Realtime, entrega las cuatro pantallas principales (Pipeline, Mi Día, Ficha, Reporting) e cierra con integración al wizard de contratos y navegación en el shell.

## Phases

- [ ] **Phase 1: Schema & Supabase Ventas** — Migraciones, RLS, tipos y cliente de datos
- [ ] **Phase 2: Pipeline Domain** — Config visual, transiciones, SLA y motivos de descarte
- [ ] **Phase 3: Hooks, Quick-Wins & Realtime** — Motor de tareas y suscripciones live
- [ ] **Phase 4: Pipeline UI** — Kanban 10 columnas, lista, filtros, alta rápida
- [ ] **Phase 5: Mi Día** — Cola priorizada y objetivos diarios del comercial
- [ ] **Phase 6: Ficha Prospecto 360** — Timeline, energía, fase, documentos, contrato vinculado
- [ ] **Phase 7: Reporting & Integración Contratos** — Funnel, actividad equipo, wizard `enviado`, nav ERP

## Phase Details

### Phase 1: Schema & Supabase Ventas

**Goal**: Base de datos ventas verificada en repo, tipos TS y capa de acceso Supabase lista para hooks.

**Depends on**: Nothing (first phase)

**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04

**Success Criteria** (what must be TRUE):
1. Migraciones `prospectos`, `actividades_ventas`, `tareas_ventas` existen en `supabase/migrations/` y aplican sin error
2. RLS impide que un comercial lea prospectos de otro comercial
3. `types.ts` exporta interfaces para Prospecto, Actividad, Tarea y enums de fase/tipo sin `any`
4. Funciones de lectura/escritura básicas probadas contra Supabase configurado

**Plans**: 3 plans

Plans:
- [x] 01-01: Commitear/verificar migraciones ventas + triggers (`handle_updated_at`, `handle_fase_change`, `handle_dias_en_fase`)
- [x] 01-02: RLS policies por `comercial_id` y jerarquía jefe/superadmin
- [x] 01-03: `src/lib/ventas/types.ts` + `src/lib/supabase/ventas.ts` con mappers

### Phase 2: Pipeline Domain

**Goal**: Lógica de negocio del pipeline centralizada y testable sin UI.

**Depends on**: Phase 1

**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04

**Success Criteria** (what must be TRUE):
1. Las 10 fases tienen label, color badge y orden kanban definidos en `pipeline.ts`
2. Intentar transición inválida devuelve error claro antes de llamar a Supabase
3. SLA y motivos de descarte están tipados y usables desde UI
4. UI puede mostrar días en fase desde datos del prospecto

**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — vitest Wave 0 + `pipeline.ts` core (fases, TRANSITIONS, validateTransition)
- [ ] 02-02-PLAN.md — SLA, MOTIVOS_DESCARTE, badge/column classes, getSlaUrgencia

### Phase 3: Hooks, Quick-Wins & Realtime

**Goal**: Capa reactiva completa — prospectos, tareas y actividades con generación automática de tareas.

**Depends on**: Phase 2

**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05, HOOK-06

**Success Criteria** (what must be TRUE):
1. Cambiar fase de prospecto crea tareas quick-win pendientes sin duplicados
2. Dos sesiones del mismo comercial ven actualizaciones de prospecto en < 2 s (Realtime)
3. Completar tarea actualiza cola y contadores sin refresh manual
4. Registrar actividad aparece en timeline vía hook + trigger DB para `cambio_fase`

**Plans**: 3 plans

Plans:
- [ ] 03-01: `quick-wins.ts` — reglas por fase y deduplicación
- [ ] 03-02: `useProspectos.ts` — CRUD, cambio fase, Realtime
- [ ] 03-03: `useTareas.ts` + `useActividades.ts` — cola, completar, timeline, Realtime

### Phase 4: Pipeline UI

**Goal**: Pantalla kanban operativa para el equipo comercial.

**Depends on**: Phase 3

**Requirements**: UI-PIPE-01, UI-PIPE-02, UI-PIPE-03, UI-PIPE-04, UI-PIPE-05, UI-PIPE-06

**Success Criteria** (what must be TRUE):
1. Comercial ve kanban con 10 columnas y cards con nombre, compañía, SLA
2. Drag a columna inválida se revierte con toast de error
3. Vista lista muestra mismos prospectos con cambio de fase
4. Alta prospecto nuevo completable en menos de 30 segundos en flujo guiado
5. Click en card abre ficha prospecto (ruta o modal según plan)

**Plans**: 3 plans

Plans:
- [ ] 04-01: `Pipeline.tsx` layout kanban + cards + convenciones UI ERP
- [ ] 04-02: Drag&drop con validación PIPE + vista lista + filtros
- [ ] 04-03: Modal alta rápida prospecto + wiring hooks

### Phase 5: Mi Día

**Goal**: Cola de trabajo diaria que elimina la duda de "¿qué hago ahora?".

**Depends on**: Phase 3 (hooks tareas); puede desarrollarse en paralelo con Phase 4 tras Phase 3

**Requirements**: UI-DIA-01, UI-DIA-02, UI-DIA-03, UI-DIA-04

**Success Criteria** (what must be TRUE):
1. Comercial abre Mi Día y ve tareas ordenadas por urgencia sin configurar filtros
2. Tareas agrupadas: hoy / esta semana / más tarde
3. Barra o contador muestra progreso del día (completadas vs total)
4. Desde una tarea se llega al prospecto o se registra actividad en un clic

**Plans**: 2 plans

Plans:
- [ ] 05-01: `MiDia.tsx` — layout, agrupación urgencia, objetivos diarios
- [ ] 05-02: Acciones rápidas y deep-link a ficha prospecto

### Phase 6: Ficha Prospecto 360

**Goal**: Vista unificada del prospecto con historial completo y avance de fase.

**Depends on**: Phase 3, Phase 4 (navegación desde pipeline)

**Requirements**: UI-FICHA-01, UI-FICHA-02, UI-FICHA-03, UI-FICHA-04, UI-FICHA-05, UI-FICHA-06

**Success Criteria** (what must be TRUE):
1. Ficha muestra fase actual, badge SLA y datos de contacto
2. Bloque energético editable: CUPS, consumo, compañía, vencimiento permanencia
3. Timeline muestra actividades en orden con tipos diferenciados
4. Cambio de fase con validación; descarte exige motivo
5. Si existe `contrato_equipo_id`, enlace visible al contrato en módulo Contratos

**Plans**: 3 plans

Plans:
- [ ] 06-01: `FichaProspecto.tsx` shell + cabecera + datos energéticos
- [ ] 06-02: Timeline actividades + formulario nueva actividad
- [ ] 06-03: Avance fase + documentos/propuesta + enlace contrato

### Phase 7: Reporting & Integración Contratos

**Goal**: Visibilidad manager y cierre venta → contrato ERP sin duplicar datos.

**Depends on**: Phase 6

**Requirements**: UI-REP-01, UI-REP-02, UI-REP-03, UI-REP-04, INT-01, INT-02, INT-03, INT-04, NAV-01, NAV-02

**Success Criteria** (what must be TRUE):
1. Funnel muestra conteos por fase y tasas de conversión
2. Jefe ve actividad por comercial del equipo; superadmin ve global
3. Motivos de descarte agregados en chart o tabla
4. Prospecto en `enviado` abre wizard precargado; al guardar, `contrato_equipo_id` en prospecto
5. Actividad `contrato_creado` en timeline; sidebar incluye Ventas (Pipeline, Mi Día, Reporting)

**Plans**: 4 plans

Plans:
- [ ] 07-01: `Reporting.tsx` — funnel, actividad, descartes, scope por rol
- [ ] 07-02: Integración `NuevoContratoWizard` precarga desde prospecto fase `enviado`
- [ ] 07-03: Post-save — FK prospecto ↔ contratos_equipo + actividad
- [ ] 07-04: Entradas sidebar y rutas App.tsx para módulo ventas

---
*Roadmap created: 2026-06-17*
*Milestone: v1.0 Sistema de Ventas — Capa de datos y Pipeline Core*
