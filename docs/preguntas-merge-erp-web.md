# Merge ERP ↔ Web — Decisiones de negocio

> Respuestas acordadas · Agosto 2026 · Destino: Supabase **website** (`unxrvwuaqhwogwvynoyq`)

---

## 1. Cuando alguien deja sus datos en la web

| # | Pregunta | **Respuesta** |
|---|----------|---------------|
| 1.1 | ¿Quién recibe el contacto? | **Todos** lo ven en apartado **"Leads web"** del sidebar. Desde ahí se **asigna** quién atiende. |
| 1.2 | ¿Pipeline directo o bandeja? | **Bandeja** → asignar comercial → **convertir a prospecto**. |
| 1.3 | ¿Plazo de contacto? | **2 horas** (SLA digital). |
| 1.4 | ¿Reenvío del formulario? | **Actualizar** el lead existente + **avisar** al comercial asignado (dedup por teléfono, como `submit_lead`). |
| 1.5 | ¿Ver factura, ahorro y tarifa? | **Sí, todo visible** desde el primer contacto. |

---

## 2. Leads web vs base comercial (Excel)

| # | Pregunta | **Respuesta** |
|---|----------|---------------|
| 2.1 | ¿Un listado o varios? | **Misma página** con campo `from_web` / prioridad; leads web **primero** en el sort. En BD: tabla **`leads`** separada → RPC **convertir a prospecto**. |
| 2.2 | ¿Seguir importando Excel? | **Sí** — Base EnerSave / listas B2B. |
| 2.3 | Permisos leads web | **Todos ven**; **jefes + tramitación + superadmin asignan**. |
| 2.3b | Permisos Excel B2B | **Superadmin + tramitación** (como Base EnerSave hoy). |

---

## 3. Qué persistir en BD

| # | Pregunta | **Respuesta** |
|---|----------|---------------|
| 3.1 | Fase 1 | Pipeline ventas: **prospectos, tareas, actividades**, **marco retributivo**, **usuarios/comerciales**, **enersave_leads**. |
| 3.2 | Fase 2 | **Contratos, liquidaciones, incidencias** (después del merge inicial). |

---

## 4. Usuarios y permisos

| # | Pregunta | **Respuesta** |
|---|----------|---------------|
| 4.1 | Tipos de usuario | **4 roles**: `superadmin`, `jefe_comercial`, `comercial`, `tramitacion`. |
| 4.2 | Alcance por rol | Comercial → lo suyo; jefe → equipo; superadmin/tramitación → global (según pantalla). |
| 4.3 | Acceso | **Supabase Auth** (email + contraseña). |
| 4.4 | Aprobación usuarios | **Solo superadmin**. |

---

## 5. Tarifas y comparador

| # | Pregunta | **Respuesta** |
|---|----------|---------------|
| 5.1 | ¿Mismo catálogo web/ERP? | **Sí** — mismo catálogo; sync vía edge AT Enterprise. |
| 5.2 | ¿Quién publica en web? | **Superadmin**. |
| 5.3 | ¿Nombre comercial distinto? | **Sí** — campo **`web_alias`** en `tariffs`. |
| 5.4 | ¿Comisiones ligadas al catálogo? | **Post-merge** — marco retributivo + API AT Enterprise (fase posterior). |

---

## 6. Contratos y post-venta

| # | Pregunta | **Respuesta** |
|---|----------|---------------|
| 6.1 | ¿Tarea automática al activar? | **Pendiente** — decidir después del merge. |
| 6.2 | ¿Un flujo o varios? | **Un solo flujo** — wizard interno del equipo. |
| 6.3 | ¿Documentos en servidor? | **Sí** — **Supabase Storage** desde el inicio. |

---

## 7. Un solo sistema o dos

| # | Pregunta | **Respuesta** |
|---|----------|---------------|
| 7.1 | ¿Un único Supabase? | **Sí** — destino = BD **website**; ERP apunta ahí tras migración. |
| 7.2 | ¿Motivo para separar ventas/web? | **No** — unificado con **RLS** (público anónimo vs authenticated). |

---

## Migraciones (fase 1)

Archivos en repo **EnerSave** → `supabase/migrations/`:

| Archivo | Contenido |
|---------|-----------|
| `20260820100000_erp_merge_foundation.sql` | `private` schema, `erp_comerciales`, helpers auth |
| `20260820100100_erp_merge_ventas_tables.sql` | `prospectos`, `tareas_ventas`, `actividades_ventas` |
| `20260820100200_erp_merge_ventas_rls_rpcs.sql` | RLS + RPCs ventas |
| `20260820100300_erp_merge_marco_retributivo.sql` | `marco_retributivo` + seed |
| `20260820100400_erp_merge_enersave_leads.sql` | Base B2B Excel |
| `20260820100500_erp_merge_leads_workflow.sql` | Campos ERP en `leads` + assign/convert RPCs |
