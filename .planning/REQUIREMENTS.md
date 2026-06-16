# Requirements: ERP EnerSave — Milestone v1.0

**Defined:** 2026-06-17
**Milestone:** v1.0 Sistema de Ventas — Capa de datos y Pipeline Core
**Core Value:** Un comercial sabe qué hacer cada día; al cerrar, el contrato entra sin duplicar datos.

## v1.0 Requirements

### Data & Schema (DATA)

- [ ] **DATA-01**: Migraciones locales alineadas con tablas `prospectos`, `actividades_ventas`, `tareas_ventas` y triggers documentados
- [ ] **DATA-02**: Políticas RLS por comercial y jerarquía (comercial ve sus prospectos; jefe ve equipo; superadmin ve todo)
- [ ] **DATA-03**: Tipos TypeScript en `src/lib/ventas/types.ts` reflejan schema Supabase sin `any`
- [ ] **DATA-04**: Cliente Supabase para ventas con mappers row ↔ domain (`src/lib/supabase/ventas.ts` o equivalente)

### Pipeline Config (PIPE)

- [ ] **PIPE-01**: `pipeline.ts` define 10 fases con labels, colores, orden kanban y fases terminales
- [ ] **PIPE-02**: Transiciones válidas entre fases validadas antes de persistir
- [ ] **PIPE-03**: SLA por fase (días máximos) y motivos de descarte tipados
- [ ] **PIPE-04**: `dias_en_fase` visible en UI desde campo calculado en BD

### Quick Wins & Tareas (TASK)

- [ ] **TASK-01**: `quick-wins.ts` define reglas de tareas por fase destino
- [ ] **TASK-02**: Al cambiar fase, se crean tareas pendientes según quick-wins (sin duplicar si ya existen)
- [ ] **TASK-03**: Tipos de tarea: primer_contacto, llamada_seguimiento, enviar_propuesta, recoger_documentacion, verificar_alta, recontacto_programado, encuesta_satisfaccion
- [ ] **TASK-04**: Tareas tienen prioridad/urgencia y fecha objetivo para ordenación en Mi Día

### Hooks & Realtime (HOOK)

- [ ] **HOOK-01**: `useProspectos` — list, create, update, cambio de fase con validación PIPE
- [ ] **HOOK-02**: `useProspectos` suscrito a Realtime (insert/update/delete) para el scope del usuario
- [ ] **HOOK-03**: `useTareas` — cola filtrada por comercial, completar/dismiss, contadores urgencia
- [ ] **HOOK-04**: `useTareas` Realtime para actualización de cola sin refresh manual
- [ ] **HOOK-05**: `useActividades` — timeline inmutable por prospecto, crear nota/llamada/etc.
- [ ] **HOOK-06**: `useActividades` Realtime para nuevas entradas en ficha y reporting

### Pipeline UI (UI-PIPE)

- [ ] **UI-PIPE-01**: `Pipeline.tsx` — kanban 10 columnas con cards de prospecto
- [ ] **UI-PIPE-02**: Drag&drop entre columnas respeta transiciones válidas (PIPE-02)
- [ ] **UI-PIPE-03**: Vista lista alternativa con mismos datos y acciones
- [ ] **UI-PIPE-04**: Filtros: comercial (manager), fase, compañía actual, urgencia SLA
- [ ] **UI-PIPE-05**: Crear prospecto rápido (< 30 s) desde modal o inline en columna `prospecto_nuevo`
- [ ] **UI-PIPE-06**: Navegación a ficha prospecto desde card

### Mi Día (UI-DIA)

- [ ] **UI-DIA-01**: `MiDia.tsx` — cola priorizada de tareas del comercial activo
- [ ] **UI-DIA-02**: Agrupación por urgencia (hoy / esta semana / más tarde)
- [ ] **UI-DIA-03**: Objetivos diarios visibles (tareas completadas vs pendientes)
- [ ] **UI-DIA-04**: Acción rápida desde tarea → ficha prospecto o registrar actividad

### Ficha Prospecto (UI-FICHA)

- [ ] **UI-FICHA-01**: `FichaProspecto.tsx` — cabecera con fase, SLA, datos contacto
- [ ] **UI-FICHA-02**: Bloque datos energéticos (CUPS, consumo, compañía actual, vencimiento permanencia)
- [ ] **UI-FICHA-03**: Timeline de actividades con iconos por tipo
- [ ] **UI-FICHA-04**: Avance de fase con selector validado y motivo si descarte
- [ ] **UI-FICHA-05**: Sección documentos / propuesta (campos de propuesta del prospecto)
- [ ] **UI-FICHA-06**: Enlace a contrato `contratos_equipo` si `contrato_equipo_id` existe

### Reporting (UI-REP)

- [ ] **UI-REP-01**: `Reporting.tsx` — funnel de conversión por fase (conteos y %)
- [ ] **UI-REP-02**: Actividad por comercial (actividades y tareas en período)
- [ ] **UI-REP-03**: Motivos de descarte agregados
- [ ] **UI-REP-04**: Scope por rol (comercial solo propio; jefe equipo; superadmin global)

### Integración Contratos (INT)

- [ ] **INT-01**: En fase `enviado`, abrir `NuevoContratoWizard` precargado con datos del prospecto
- [ ] **INT-02**: Al guardar contrato, insert en `contratos_equipo` y guardar `contrato_equipo_id` en prospecto
- [ ] **INT-03**: Actividad `contrato_creado` registrada en timeline
- [ ] **INT-04**: Prospecto puede avanzar a `cliente_activo` tras activación contrato (manual o trigger)

### Navegación ERP (NAV)

- [ ] **NAV-01**: Entradas sidebar Ventas: Pipeline, Mi Día, Reporting (por rol)
- [ ] **NAV-02**: Rutas o tab switch en App para páginas ventas sin romper módulos existentes

## v2 Requirements (deferred)

- Scoring automático de leads / priorización ML
- Encuestas satisfacción con formulario externo
- Export Excel reporting
- Notificaciones push/email para tareas urgentes
- Sincronización bidireccional Client CRM ↔ Prospecto

## Out of Scope

| Feature | Reason |
|---------|--------|
| Reemplazar login simulado | Milestone futuro auth |
| Liquidaciones desde ventas | Módulo liquidaciones separado |
| Kanban incidencias unificado con pipeline | Incidencias operativas distintas de ventas |
| PWA / offline | No requerido v1.0 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| PIPE-01 | Phase 2 | Pending |
| PIPE-02 | Phase 2 | Pending |
| PIPE-03 | Phase 2 | Pending |
| PIPE-04 | Phase 2 | Pending |
| TASK-01 | Phase 3 | Pending |
| TASK-02 | Phase 3 | Pending |
| TASK-03 | Phase 3 | Pending |
| TASK-04 | Phase 3 | Pending |
| HOOK-01 | Phase 3 | Pending |
| HOOK-02 | Phase 3 | Pending |
| HOOK-03 | Phase 3 | Pending |
| HOOK-04 | Phase 3 | Pending |
| HOOK-05 | Phase 3 | Pending |
| HOOK-06 | Phase 3 | Pending |
| UI-PIPE-01 | Phase 4 | Pending |
| UI-PIPE-02 | Phase 4 | Pending |
| UI-PIPE-03 | Phase 4 | Pending |
| UI-PIPE-04 | Phase 4 | Pending |
| UI-PIPE-05 | Phase 4 | Pending |
| UI-PIPE-06 | Phase 4 | Pending |
| UI-DIA-01 | Phase 5 | Pending |
| UI-DIA-02 | Phase 5 | Pending |
| UI-DIA-03 | Phase 5 | Pending |
| UI-DIA-04 | Phase 5 | Pending |
| UI-FICHA-01 | Phase 6 | Pending |
| UI-FICHA-02 | Phase 6 | Pending |
| UI-FICHA-03 | Phase 6 | Pending |
| UI-FICHA-04 | Phase 6 | Pending |
| UI-FICHA-05 | Phase 6 | Pending |
| UI-FICHA-06 | Phase 6 | Pending |
| UI-REP-01 | Phase 7 | Pending |
| UI-REP-02 | Phase 7 | Pending |
| UI-REP-03 | Phase 7 | Pending |
| UI-REP-04 | Phase 7 | Pending |
| INT-01 | Phase 7 | Pending |
| INT-02 | Phase 7 | Pending |
| INT-03 | Phase 7 | Pending |
| INT-04 | Phase 7 | Pending |
| NAV-01 | Phase 7 | Pending |
| NAV-02 | Phase 7 | Pending |

**Coverage:**
- v1.0 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0

---
*Requirements defined: 2026-06-17*
*Last updated: 2026-06-17 after roadmap creation*
