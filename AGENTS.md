# AGENTS.md — ERP-ENERSAVE

Guía para cualquier persona o IA que vaya a tocar este repo. Léela entera antes de cambiar nada. **Se actualiza en cada commit** (ver §10).

Idioma: explicaciones y textos de UI en **español**; código, nombres de ficheros, comentarios y commits en **inglés**.

---

## 1. Qué es esto

ERP interno de **EnerSave** (asesoría energética): contratos, clientes, liquidaciones/comisiones, incidencias, tarifas, marco retributivo, comparador de facturas, pipeline de ventas y leads que llegan desde la web pública.

- SPA **React 19 + Vite 6 + TypeScript 5.8 + Tailwind 4 + shadcn/ui + React Router 7**.
- Backend único: **Supabase** (Postgres + RLS + Edge Functions + Storage + Auth). Proyecto `unxrvwuaqhwogwvynoyq`, **compartido con la web pública** (ver §6).
- Despliegue en Vercel (`vercel.json` reescribe todo a `index.html`).
- Iconos: **lucide-react**. `sonner` está aliasado a `src/lib/sonner-silent.ts` (ver `vite.config.ts`); para toasts reales se importa `sonner-original`.

> El `README.md` es la plantilla de AI Studio y está obsoleto. Esta guía manda.

## 2. Comandos

```bash
npm install
npm run dev        # vite en :3000
npm run lint       # tsc --noEmit  (no hay ESLint)
npm run test       # vitest run, solo src/**/*.test.ts, entorno node
npm run build      # vite build
npm run db:apply   # scripts/apply-supabase-sql.mjs (aplica SQL a Supabase)
```

- Antes de dar algo por terminado: `npm run lint` y `npm run test` en verde.
- **PROHIBIDO desplegar** (build+push+release, Vercel, `deploy_edge_function`, etc.) salvo orden explícita del usuario. Commit y push sí.
- Hay `bun.lock` y `package-lock.json`; los scripts se documentan con npm.
- `app.version.json` → versión visible en la app (`public/app-version.json` se regenera en build/dev). Subirla es decisión del dueño, no la toques por tu cuenta.

## 3. Secretos y entorno

`.env` (ignorado por git) contiene `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GMAIL_*`, `VITE_INVOICE_AI_*`.

- **Nunca** leas ni pegues valores en chat, commits, docs ni logs.
- **Nunca** pongas la service role en una variable `VITE_*` ni en código de cliente. Solo vive en Edge Functions / scripts de servidor.
- Los secretos de AT (`AT_ENTERPRISE_API_KEY`, `AT_*_SYNC_SECRET`) están en variables de las Edge Functions, no en el repo.

## 4. Mapa del repo

```
src/
  App.tsx                 # solo monta <AppProviders/>
  providers/              # AppProviders (router+tema), ErpDataProvider, ContractActionsProvider
  lib/router.tsx          # definición de rutas (fuente de verdad del routing)
  constants/navigation.ts # tabs, slugs /erp/* y /ventas/*, módulos
  pages/
    auth/ customer/       # login/registro y portal de cliente (role customer)
    erp/                  # una carpeta por módulo + routes/ (lazy) + ErpWorkspace
    ventas/               # routes/ (mi-dia, pipeline, leads-web, base-enersave, sla-avisos, reporting)
  components/             # ui/ (shadcn), layout/, y una carpeta por dominio
  hooks/                  # hooks globales (useAuth, navegación, FTP, AT…)
  lib/                    # lógica PURA con tests *.test.ts (sin React)
    supabase/             # capa de datos: un módulo por tabla/dominio, devuelve Result
    ventas/               # pipeline, SLA, stage-gate, KPIs, hooks de ventas
    comparador/           # cliente y mapeo de la IA de facturas
    webhooks/             # handler erp-sync
  api/erp/                # servicios (en migración desde lib/supabase)
  data/                   # seeds/catálogos estáticos (marco retributivo, tarifas, FTP, ubicaciones)
  types/profile.ts        # UserRole, Profile, permisos
supabase/
  config.toml             # verify_jwt por función
  migrations/             # SQL versionado (ver §7)
  functions/              # Edge Functions (Deno) + _shared/
  sql/ scripts/ tests/    # SQL de setup, diagnóstico puntual y tests RLS
docs/                     # decisiones y notas (ver §11)
app/                      # RESTO de Next.js (actions, api/webhooks/erp-sync). Excluido de tsconfig. No es la app principal.
scripts/                  # import CRM Excel, apply SQL
```

Rutas: `/erp/<slug>` y `/ventas/<slug>`. Para añadir una pantalla: tab en `constants/navigation.ts` → ruta lazy en `pages/<modulo>/routes/` → registrar en `lib/router.tsx` y `lib/workspaceModuleRegistry.ts` → permisos en `lib/workspaceAccess.ts`.

### Convenciones de código

- Alias `@/` → `src/`. `tsconfig` sin `strict`; aun así escribe tipos explícitos.
- Separa por responsabilidad: **lógica de negocio en `lib/` (pura, con test)**, acceso a datos en `lib/supabase/` o `api/`, estado en hooks, UI en componentes. Ningún fichero enorme: extrae subcomponentes/hooks (`App.tsx` ya se partió así).
- Estilo: sin `;` ni comas finales raras — imita el fichero que editas. Tailwind + shadcn; sin `div` envoltorios gratuitos.
- **UI: una sola identidad visual en todo el proyecto. Copia el patrón de las pantallas existentes; no inventes estilo propio.** Aunque se use la skill `/frontend-design`, aquí manda lo que ya hay. Referencias: `pages/erp/historial/HistorialPage.tsx` (panel `rounded-3xl`, cabecera con icono en chip + título `text-sm font-extrabold uppercase` + subtítulo `text-[10px] font-mono`), `pages/erp/comparador/ComparadorPage.tsx` (formularios), `lib/enersave-ui-theme.ts` (`supplyTabClass`, `filterPillClass`, `kpiCardClass`, `SUPPLY_KIND_THEME`), `constants/styles.ts` y los tokens `brand-*` de `index.css`. Reglas: etiquetas `text-[10px] font-mono font-bold uppercase tracking-wider`, inputs `bg-brand-surface border border-brand-border rounded-xl focus:border-blue-500 text-xs`, botón primario `rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold uppercase tracking-wider`, badges `rounded text-[8px] font-mono font-bold uppercase`, vacíos con borde discontinuo. Reutiliza componentes existentes (p. ej. `ComparadorFormSection`) antes de crear otros. Nada de bordes gruesos, tipografías gigantes ni paletas nuevas.
- Backend (Edge Functions): SOLID, una responsabilidad por módulo, lo compartido en `_shared/`.
- Tests: Vitest solo en node, sobre `lib/`. Toda regla de negocio nueva lleva su `*.test.ts` al lado.

## 5. Roles y permisos

`UserRole`: `superadmin`, `jefe_comercial`, `comercial`, `tramitacion`, `customer`.

- Comercial → lo suyo; jefe → su equipo; superadmin/tramitación → global según pantalla.
- Permisos finos en `Profile.permissions` (`contractsView`, `comparatorAccess`, `quickSettlement`, `exportDatabase`, `viewRetrocommissions`). Lógica en `lib/staff-permissions.ts`, `lib/workspaceAccess.ts`, `lib/*-permissions.ts`.
- **La seguridad real es RLS en Postgres**, no la UI. Si cambias quién ve/edita algo, hace falta migración de políticas + test (`supabase/tests/`).
- Staff entra por Supabase Auth (email+contraseña, MFA/OTP para admin: `lib/admin-mfa-policy.ts`, función `staff-login-otp`). Altas por invitación (`send-staff-invitation`, solo superadmin aprueba).
- Hay un "guardián de integridad" (`use-runtime-integrity-guard`, `runtime-integrity*`) que puede bloquear pantallas; bypass por usuario en `user_profiles.integrity_guard_bypass`.

## 6. Flujo ERP ↔ Enersave-website

Repos hermanos: `ERP-ENERSAVE` (este) y `EnerSave` (web pública, GitHub `EnerSave-Website/EnerSave`, React+Vite, desplegada en Vercel). **Comparten la misma base Supabase** (`unxrvwuaqhwogwvynoyq`); la web entra como usuario anónimo/`authenticated` y el ERP como staff, separados por RLS. Decisiones de negocio en `docs/preguntas-merge-erp-web.md`.

```
Web (comparador IA / formulario)
  ├─ sube factura → Storage bucket `facturas` (ruta UUID, se guarda la RUTA, no la URL)
  ├─ RPC submit_lead (dedup por teléfono) → tabla `leads`
  ├─ lee tarifas: `tariffs` (web_visible=true) + `tariff_prices` + `providers`
  └─ triggers → alertas Telegram/WhatsApp (funciones de la web)
                │
                ▼
ERP  "Leads web" (ventas)
  ├─ todos ven el lead; jefe_comercial/tramitación/superadmin ASIGNAN (assigned_comercial_id)
  ├─ SLA digital 2 h (`sla_due_at`); reenvío del form actualiza el lead y avisa (`resubmitted_at`)
  ├─ RPC `convert_web_lead_to_prospecto_v1` (`prospecto_id`) → pipeline de ventas
  ├─ invitar al cliente al portal (`erp_invited_at`, auth_user_id, función invite-customer-from-lead de la web)
  └─ prospecto → contrato (wizard) → contratos_equipo → liquidaciones
```

Reglas del cruce:

- **Tabla `leads` y bucket `facturas` son contrato compartido con la web.** Si cambias columnas, RPCs (`submit_lead`, `append_invoice_to_lead`…) o políticas, revisa también el repo `EnerSave` (`src/api/services_leads.ts`, `services_facturas.ts`) y avisa al usuario: hay que coordinar migración + deploy de los dos.
- Las URLs de factura se **firman al leer** (`lib/supabase/facturas-storage.ts → signFacturaPaths`). No guardes URLs firmadas.
- **Tarifas: mismo catálogo para web y ERP.** `tariffs.web_visible` lo publica solo superadmin; `web_alias` es el nombre comercial en la web; `tariffs.erp_active` controla visibilidad en el ERP. El comparador de la web (`comparador-calculos.ts`) y el del ERP (`lib/tarifa-cost-calculator.ts`) deben dar los mismos números: si tocas uno, revisa el otro.
- Tarifas y marco (ver §8) se consumen vía RPC `list_tariffs_catalog` (migración `20260820100700` de la web) con caché stale-while-revalidate (`tariffs-catalog-cache.ts`, `marco-retributivo-cache.ts`, hook `use-supabase-catalog-cache-refresh`).
- `app/api/webhooks/erp-sync` + `lib/webhooks/erp-sync-handler.ts`: webhook de Database Webhook hacia el CRM de fidelización (`contratos_erp`). Header `x-webhook-secret`. Resto de Next.js, no forma parte del build de Vite.
- Comparador de facturas con IA: Edge Function `ai-assistant` (proyecto compartido), cliente en `lib/comparador/invoice-ai-client.ts`, mapeo a formulario en `invoice-ai-to-comparador.ts`. Docs en `docs/comparador-invoice-*.md`. Ojo: `VITE_INVOICE_AI_KEY` viaja en el cliente (deuda conocida, usar solo clave `pk-`).

## 7. Base de datos (Supabase)

- Todo cambio de esquema = **migración nueva** en `supabase/migrations/` con nombre `YYYYMMDDHHMMSS_descripcion.sql`. No edites migraciones ya aplicadas. Habilita RLS en tablas nuevas y escribe sus políticas en la misma migración.
- Aplicar a remoto es acción con efecto fuera del repo: **pide confirmación** antes de `apply_migration` / `db:apply`.
- La BD es compartida con la web: una migración destructiva afecta a producción de la web.
- Edge Functions con `verify_jwt = false` (las `sync-*-at`, `ate-webhooks`) deben validar su propio secreto/firma.
- Tablas núcleo: `clientes`, `contratos_equipo` (+ documentos/notas/historial en Storage), `settlements` (liquidaciones, retrocomisiones, autofacturas), `incidencias`, `providers`/`tariffs`/`tariff_prices`, `marco_retributivo`, `erp_comerciales`, `user_profiles`, `prospectos`/`tareas`/`actividades`, `leads`, `avisos`, `alegaciones`, `calendario_eventos`, `ftp_nodes`, `erp_settings` (fila `id=1`).

## 8. Tarifas y marco retributivo (modelo de datos)

**ESTADO ACTUAL (2026-10-08): consolidado en Enertech, AT descartado por completo.** `providers`, `tariffs`, `tariff_prices` y `marco_retributivo` fueron **archivadas** (`RENAME TO ..._legacy_archive`, no borradas — siguen en BD por si hace falta recuperar algo, pero ningún código nuevo debe leerlas ni escribirlas salvo para mostrar datos históricos de contratos ya cerrados). Decisión del dueño: cero datos de AT, cero duplicación con Enertech, incluso datos manuales del ERP que no coincidan con Enertech quedan fuera de la app en vivo.

| Pantalla | Tabla viva | Antes (archivado) |
|---|---|---|
| Tarifas / Productos | `enertech_precios` (clave `clave`, precios P1-P6 en `payload`) + `enertech_comercializadoras` (`company_id → id`) | `tariffs` + `tariff_prices` + `providers` |
| Marco retributivo (comisiones) | `enertech_comisiones` (agrupada por campaña+tarifa) | `marco_retributivo` |

- `enertech_precios` tiene columnas de curación propias del ERP, añadidas sobre el espejo de la API: `web_visible`, `erp_active`, `web_alias`, `web_sort_order`, `segment`, `pricing_model`, `is_indexed`, `is_solar_rate`, `sva_name`, `sva_price_monthly`, `permanence_text`, `legacy_tariff_name`. `enertech_comercializadoras` tiene `logo_url`, `is_active`. Estas columnas **no las toca el sync** (`enertech-sync-precios`/`enertech-sync-comercializadoras`); son edición manual del ERP sobre filas que siguen viniendo de Enertech.
- RPC `list_tariffs_catalog_v1` y `update_tariff_web_settings_v1` (esta última reescrita con `p_tariff_id text`, antes `uuid`; las firmas `uuid` antiguas quedaron huérfanas, inofensivas, sin llamador) ya apuntan a `enertech_precios`/`enertech_comercializadoras`.
- `src/lib/supabase/tariffs.ts` y `tariffs-catalog.ts` leen/escriben `enertech_precios` directamente (sin RPC) para el comparador en vivo, el panel de Productos y el dedup. `segment` llega siempre `residencial` desde el sync (Enertech no distingue segmento); el filtro por nombre (`tariffMatchesErpAudience`) sigue aplicando como heurística adicional, igual que antes.
- **Marco retributivo (comisiones) vive en `enertech_comisiones`.** Grano: una fila por tramo de consumo (`tramo`: "40000-50000 kWh") × campaña (`campania`, nombre de producto, p.ej. "TERRA SOLID 24h ZEN 8") × tarifa de acceso (`tarifa`, p.ej. "2.0TD"). `src/lib/supabase/marco-retributivo.ts` agrupa esas filas por (campaña, tarifa de acceso) en entradas `MarcoRetributivoRow` con un tramo por fila, para no tocar los ~30 ficheros que ya consumen esa forma.
  - `enertech_comisiones.company_id` se rellenó (2026-10-08) comparando `payload->>'campania'` contra `marco_retributivo_legacy_archive.tarifa` (mismo nombre de producto) para heredar la compañía. Cobertura: **10.132 de 19.120 filas (~53%)**, 16 compañías. El resto son productos (`TERRA AIR KIT`, `dinamica plus *`, `tarifas plus *`, `levante/poniente/tramontana/siroco`...) que nunca estuvieron en el marco manual: su compañía es **desconocida de verdad**, no un fallo de matching — para esas filas `compania` queda vacío y `resolveCompaniaFromMarcoTarifa` simplemente no resuelve nombre (sin crashear).
  - `tipo_comision` → unidad de tramo: `fijo_contrato` → `eur_cups` (importe fijo); `fijo_mwh` → `eur_mwh` (usa `comision_por_mw`); `fijo_kwh` → `eur_mwh` normalizando ×1000; `fee_energia`/`fee_potencia`/`margen` (0,5% de las filas) se tratan como `eur_cups` por aproximación, sin dato suficiente para distinguir mejor.
  - **CRUD manual (2026-10-08): `createMarcoEntry`/`updateMarcoEntry`/`deleteMarcoEntry`/`bulkDeactivateMarcoEntries` (`src/lib/supabase/marco-retributivo.ts`) escriben ya directamente en `enertech_comisiones`**, restringido por RLS a `superadmin`/`tramitacion` (`private.is_marco_retributivo_manager()`, migración `20261008120000_enertech_comisiones_manual_crud.sql`). Invariante: **los datos de la API Enertech siempre prevalecen**.
    - Columna `enertech_comisiones.source` (`'api'` por defecto, `'manual'`): crear inserta una fila con `source='manual'` y una clave sintética `manual:<uuid>` que nunca puede chocar con una clave real de la API. El motor de sync (`manualSourceColumn: 'source'` en `enertech-entities.ts` → `enertech-sync-engine.ts`) **excluye las filas `source='manual'` de `loadExisting`**, así que nunca entran en el cálculo de "desaparecidas del feed" (`removedKeys`) y sobreviven indefinidamente a los sync — sin este cambio, cualquier fila manual habría sido marcada `removed_at` en el siguiente sync de comisiones (cada 6h), porque nunca aparece en el feed real.
    - Editar una fila que vino de la API no cambia su `source` (sigue `'api'`), así que el próximo sync la reconoce por `clave` y la sobrescribe con el valor real de Enertech — la edición manual es temporal hasta el siguiente sync, tal y como se pidió. Borrar una fila de la API es borrado blando (`removed_at`): si sigue en el feed, el próximo sync la restaura igual que cualquier fila "desaparecida y reaparecida". Borrar una fila manual es borrado físico (la política DELETE solo lo permite para `source='manual'`).
    - UI: los botones de crear/editar/borrar en la pantalla de Marco Retributivo (`MarcoRetributivoToolbar`/`MarcoRetributivoTable`) **ya estaban condicionados a `canEdit` (oculos del DOM, no solo deshabilitados)** vía `canEditMarcoRetributivo` (`lib/marco-retributivo-permissions.ts`: `tramitacion` siempre, `superadmin` solo en `superadminViewMode === "tramitacion"`) — no hicieron falta cambios de UI, solo que las mutaciones dejaran de fallar.
    - `resolveEnertechCompanyIdByName` resuelve `company_id` por nombre de compañía (`ilike` contra `enertech_comercializadoras.nombre`) al crear/editar; puede no encontrar coincidencia (compañía nueva o nombre distinto) y deja `company_id` en null sin fallar.
- `providers_legacy_archive` se sigue consultando desde `contracts.ts` solo para mostrar el nombre de compañía en contratos históricos sincronizados desde AT (`at_company_id` en su `at_payload`); es lectura histórica, no alimenta nada nuevo.

## 9. API AT Enterprise — ESTADO: DESCARTADA Y CONGELADA CON CORTE LIMPIO (decisión del dueño, 2026-10-08)

**El dueño decidió explícitamente no usar nada de AT nunca más**, y eligió la opción 2 de las tres que este fichero dejaba abiertas: **"congelar con corte limpio"**. `providers`/`tariffs`/`tariff_prices`/`marco_retributivo` están archivadas (§8). El código de sync/outbound/reactivación de AT en el repo **ya se retiró** (commit `refactor(at): retire AT sync/outbound code and reactivation UI`, 2026-10-08) — ver qué queda y qué falta por retirar manualmente en Supabase más abajo.

### Qué se retiró del repo (ya hecho)

- Edge Functions completas: `at-contract-notes`, `push-contract-at`, `sync-{clients,comparisons,contracts,emails,incidents,liquidations,marcos,tariffs}-at`, `ate-webhooks`.
- Helpers compartidos usados solo por esas funciones: `_shared/at-*.ts`, `_shared/sync-*.ts`, `_shared/marco-link.ts`, `_shared/sync-marco-settlements.ts`.
- Cliente ERP: `lib/supabase/{push-contract-at,at-contract-notes,at-ftp,erp-settings}.ts`, `lib/at-api-toggle.ts`, `lib/at-outbound-map.ts`, `lib/at-api-disabled.ts`, `providers/AtApiSettingsProvider.tsx`, `hooks/use-at-outbound-settings.ts`, `hooks/use-at-contract-notes.ts`.
- UI de reactivación: el switch "API AT activa/apagada" en `AppShell.tsx` y todo lo que lo montaba (`ErpWorkspace.tsx` ya no envuelve en `AtApiSettingsProvider`).
- Rama AT del explorador de FTP: `useFtpExplorer.ts`/`ftp-sources.ts`/`FtpPanel.tsx` ya no tienen la carpeta virtual "Archivo AT" — nunca tuvo una Edge Function `at-ftp` en este repo que la respaldara (sí existe una `at-ftp` desplegada en Supabase, ver más abajo, pero sin código fuente aquí), así que esa rama solo mostraba una carpeta siempre vacía/con error. El explorador ahora solo tiene la raíz "FTP EnerSave".
- Tipos `AtContractNote`/`AtContractEvent`/`AtContractDocument`/`AtContractEmail`/`AtContractPrice` movidos a `src/types/at-contract-history.ts` (puro, sin red) — las pestañas de Historial/Incidencias/Documentos/Notas de un contrato siguen mostrando esos campos `at_*` ya guardados en `contratos_equipo`, como histórico de solo lectura; ya no se refrescan contra AT en cada apertura del contrato.

### Qué NO se tocó (histórico de solo lectura, sigue igual)

- Columnas `at_*` en `tariffs_legacy_archive`/`providers_legacy_archive`/`clientes`/`contratos_equipo`/`marco_retributivo_legacy_archive` y las tablas `at_comparisons`/`at_email_logs`: se quedan como "legacy", sin código que las vuelva a sincronizar.
- `lib/supabase/at-comparisons.ts`, `lib/supabase/at-emails.ts`, las pestañas que las leen: siguen igual, son solo `.select()` sobre lo ya guardado.
- `erp_settings.at_outbound_enabled` (la columna/fila en BD): no se borró ni se tocó, simplemente ya no la lee nada en el repo.

### Pendiente — requiere acción manual en Supabase (no hay orden explícita para ejecutarlo desde aquí)

**Siguen ACTIVE y desplegadas en el proyecto estas Edge Functions, aunque ya no queda código fuente en el repo que las despliegue ni las llame:** `sync-tariffs-at`, `at-ftp`, `sync-marcos-at`, `ate-webhooks`, `sync-clients-at`, `sync-contracts-at`, `sync-liquidations-at`, `sync-incidents-at`, `sync-comparisons-at`, `at-contract-notes`, `push-contract-at`. Siguen respondiendo si alguien les llama directamente (aunque internamente ya no hagan nada útil porque `at_outbound_enabled=false` y, para varias, bloqueado también por el flag). Borrarlas de Supabase es una acción de despliegue/infra que AGENTS.md (§2) exige pedir explícitamente — no se ha hecho. Ningún cron las llama hoy (comprobado en `cron.job`: no hay ninguno con `at` en el nombre).

**Nueva API:** Enertech/aenergetic (`https://intranet.enertechcore.com/v1`, guía en `docs/BIENVENIDA-NUEVA-API.md`). Análisis de diferencias, viabilidad del conmutador y estrategia de BD en **`docs/analisis-api-enertech-vs-at.md`** (léelo antes de tocar nada de integración). Resumen: se recomienda conmutador con proveedor activo único + migración aditiva (`external_provider`/`external_id` + tabla `external_refs`), sin borrar datos AT. La API nueva NO cubre incidencias, liquidaciones, comparativas, emails ni FTP.

**Espejo de la API Enertech — DECISIÓN TOMADA (2026-10-06): tablas y Edge Functions propias con prefijo `enertech_` / `enertech-`, separadas de las de AT. No se mezclan con `providers`/`tariffs`/`contratos_equipo`/`clientes`.** Sustituye a la propuesta de `external_*` + `external_refs` del análisis (§4) para estos datos.

**ESTADO (2026-10-09): catálogo (comercializadoras/tarifas-acceso/precios/comisiones) en vivo, con clave y datos reales. Clientes/contratos/SIPS, código listo pero sin desplegar — decisión explícita de no desplegarlos por ahora (ver abajo).**

| Endpoint Enertech | Tabla | Edge Function | Cron |
|---|---|---|---|
| `GET /comercializadoras` | `enertech_comercializadoras` (45 filas) | `enertech-sync-comercializadoras` ✅ desplegada | diario 03:00, activo |
| `GET /tarifas-acceso` | `enertech_tarifas_acceso` (14 filas) | `enertech-sync-tarifas-acceso` ✅ desplegada | diario 03:05, activo |
| `GET /precios?todas=1` | `enertech_precios` (PK `clave`, 2.177 filas) | `enertech-sync-precios` ✅ desplegada | cada 6 h (:10), activo |
| `GET /comisiones?todas=1` | `enertech_comisiones` (PK `clave`, 19.120 filas) | `enertech-sync-comisiones` ✅ desplegada | cada 6 h (:20), activo |
| `GET /clientes` (paginado) | `enertech_clientes` | `enertech-sync-clientes` ❌ NO desplegada | cron creado pero **pausado** (`active=false`) a propósito |
| `GET /contratos` (incremental `modificado_desde`) | `enertech_contratos` | `enertech-sync-contratos` ❌ NO desplegada | cron creado pero **pausado** (`active=false`) a propósito |
| `GET /sips` | `enertech_sips_consultas` | `enertech-sips-lookup` ❌ NO desplegada | — (bajo demanda) |
| `GET /perfil` | — | `enertech-perfil` ✅ desplegada (valida la clave) | — |

- **Decisión del dueño (2026-10-09): clientes y contratos de Enertech NO se espejan en el ERP.** `enertech_clientes`/`enertech_contratos` duplicarían las tablas núcleo reales (`clientes`, `contratos_equipo`), y el dueño quiere cero duplicidad — igual que con AT (§9). Sus Edge Functions no se despliegan y sus cron jobs se dejaron `active=false` en `cron.job` (no se borraron, por si algún día se decide lo contrario). No reactivar sin orden explícita.
- Migraciones `20261006120000_enertech_sips_consultas.sql` y `20261006130000_enertech_mirror_tables.sql`: **aplicadas** (contradice una nota anterior de este fichero que decía lo contrario — quedó desactualizada).
- Cada tabla espejo guarda `payload` (fila cruda completa), `content_hash`, `actualizado_en`, `first_seen_at/last_seen_at/changed_at/removed_at`. Una fila cuenta como cambiada si `actualizado_en` difiere **o** el hash difiere (`_shared/enertech-diff.ts`). Los cambios quedan en `enertech_catalog_changes` (base para avisos). Las filas que desaparecen de un feed completo se marcan `removed_at`, nunca se borran; protección: no se aplican bajas tras una respuesta vacía o con menos de la mitad de filas. Contratos es incremental: nunca marca bajas; el cursor vive en `enertech_sync_state` (último `fecha_actualizacion` − 120 s).
- Motor: `_shared/enertech-sync-runner.ts` (auth, explore/sync, flag, lock, log de ejecuciones en `enertech_sync_runs`), `enertech-sync-engine.ts` (upsert + diff), `enertech-entities.ts` (una definición por endpoint), `enertech-mappers.ts` (fila cruda → columnas; **nombres de campo de comercializadoras/precios/comisiones son suposiciones tolerantes: el OpenAPI no los fija**).
- **Interruptor:** `erp_settings.enertech_sync_enabled` — **activado (`true`) desde 2026-10-09.** El cron sincroniza solo el catálogo (comercializadoras/tarifas-acceso/precios/comisiones); clientes/contratos no corren porque sus cron jobs están pausados, no por el flag. `?force=1` lo salta para pruebas manuales; `?mode=explore` (GET) nunca escribe y devuelve campos y muestras.
- **No hay webhooks de catálogo.** La API de Enertech solo ofrece webhook para cambios de estado de un contrato (`docs/BIENVENIDA-NUEVA-API.md`, "Avisos en tiempo real"); no existe aviso push para precios/comisiones/comercializadoras — el cron es la única vía para mantenerlos al día.
- **Webhook de cambio de estado de contrato — desplegado (`ACTIVE`, `verify_jwt=false`), a falta del secreto real de Enertech.** `supabase/functions/enertech-contract-webhook` verifica la firma `HMAC-SHA256` (header configurable por `ENERTECH_WEBHOOK_SIGNATURE_HEADER`, por defecto `x-enertech-signature`; secreto `ENERTECH_WEBHOOK_SECRET`) sobre el cuerpo crudo y registra cada entrega en `enertech_webhook_events` (migración `20261009134429_enertech_webhook_events.sql`, **aplicada**, RLS con select solo para staff). Devuelve `500` si `ENERTECH_WEBHOOK_SECRET` no está configurado (así está ahora), `401` si la firma no cuadra, `200` si cuadra. **No actualiza `contratos_equipo`**: Enertech documenta el mecanismo de firma pero manda el payload y la forma de verificarlo "aparte", y no mirrorizamos `enertech_contratos` (ver más arriba), así que todavía no hay forma de mapear un contrato de Enertech a una fila de `contratos_equipo` — esto es solo el log de auditoría hasta que se diseñe ese emparejamiento (¿por CUPS? ¿columna `external_id`?). Pendiente: dar la URL del endpoint (`https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1/enertech-contract-webhook`) a Enertech, guardar el secreto que devuelvan como secreto de la función `ENERTECH_WEBHOOK_SECRET` (`create_edge_function_secret` o dashboard → Edge Functions → Secrets), y confirmar con ellos el nombre real de la cabecera de firma (si no es `x-enertech-signature`, fijar `ENERTECH_WEBHOOK_SIGNATURE_HEADER` acorde) y la forma del payload.
- Secretos de las funciones: `ENERTECH_API_KEY`, `ENERTECH_SYNC_SECRET` (Bearer del cron y de las pruebas), opcional `ENERTECH_API_BASE_URL` (`https://devintranet.enertechcore.com/v1` para pruebas). Ya configurados como secretos de proyecto (compartidos por todas las Edge Functions); si se despliega `enertech-sips-lookup` en el futuro, los hereda sin configurar nada nuevo.
- Tests sin API real: `src/lib/enertech/*.test.ts` (diff, mappers, extractores y motor completo con Supabase en memoria y `fetch` simulado). `npm run lint` no comprueba tipos de las Edge Functions con Deno (no hay Deno en el entorno): revisar a mano lo que no importe el test.

**Pantalla SIPS — código escrito y ya registrado en el ERP (ruta, sidebar, permisos), pero su Edge Function SIN desplegar** (`/erp/sips`, consulta de CUPS vía `GET /sips` de Enertech). Independiente del conmutador AT/Enertech. Diseño y fases en §8 del análisis. Piezas: `src/lib/sips/` (validación CUPS, parseo, reintentos; con tests), `src/lib/supabase/sips.ts` (cliente), `src/pages/erp/sips/` (UI), `supabase/functions/enertech-sips-lookup` (+ `_shared/enertech-api.ts`, `sips-cups.ts` espejo de `lib/sips/cups.ts`: mantener sincronizados). Migración `20261006120000_enertech_sips_consultas.sql`: **aplicada** (tabla `enertech_sips_consultas` existe, vacía). Para ponerla en marcha solo falta desplegar `enertech-sips-lookup` (hereda `ENERTECH_API_KEY` ya configurado como secreto de proyecto, no hace falta nada nuevo). Reglas: la API key solo vive en esa Edge Function, usar siempre `resumen` (nunca `datos`), validar el CUPS antes de consultar, manejar `listo/procesando/sin_datos`. Permiso: reutiliza `comparatorAccess` (`canAccessSips` en `lib/staff-permissions.ts`); **tramitación lo tiene a `false` por defecto, así que no ve SIPS hasta que un superadmin se lo active** — decisión pendiente: crear `sipsAccess` propio.

**Contexto:** AT (`https://api.at-enterprise.es/v1`) fue la fuente externa de tarifas, clientes, contratos, incidencias, liquidaciones, comparativas y emails, además de destino de altas de contrato. Enertech la sustituye (§8). El interruptor `erp_settings.at_outbound_enabled` sigue en la tabla (nadie lo borró) pero **ya no lo lee ningún código del repo** — era él quien bloqueaba las llamadas salientes antes de que se retirara el código que las hacía.

- **No reactives nada de AT ni borres sus datos/columnas `at_*` sin orden explícita** — siguen siendo histórico de solo lectura (ver arriba qué se conservó).
- Código nuevo que necesite "origen externo" debe usar un nombre neutro (`external_id`, `source`), como ya hace `enertech_comisiones.source` (§8).
- Decisión de las tres opciones que este fichero dejaba abiertas: **se eligió la 2 (congelar con corte limpio)**, ejecutada en el commit de arriba. Las opciones 1 y 3 quedan descartadas, no hace falta revisarlas de nuevo.

## 10. Protocolo de actualización de este fichero

**Cada commit que cambie comportamiento, estructura, esquema, flujos o decisiones debe actualizar AGENTS.md en el mismo commit.** Checklist:

- [ ] ¿Nueva pantalla/ruta/módulo? → §4
- [ ] ¿Cambio de roles/permisos/RLS? → §5, §7
- [ ] ¿Toca `leads`, `facturas`, tarifas o RPCs compartidos con la web? → §6 (y nota para el repo `EnerSave`)
- [ ] ¿Migración nueva o tabla nueva? → §7
- [ ] ¿Algo de AT o de la API nueva? → §9
- [ ] ¿Nueva convención, comando o gotcha? → §2 / §4 / §13
- [ ] Añadir una línea al **Registro de cambios** (§12), la más reciente arriba.

Si el commit no afecta a nada de lo anterior, no hace falta tocarlo.

### Reglas de commit

- Conventional Commits en inglés: `tipo(scope): mensaje` (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`, `build`, `ci`).
- Un commit por responsabilidad. No mezcles limpieza de AT con features.
- Firma solo el usuario de git configurado. **Sin `Co-Authored-By` ni menciones a Claude/Anthropic/IA** en commits ni PRs.
- Rama de trabajo: `develop`; `main` es la de PR/producción.

## 11. Documentación existente

| Fichero | Para qué |
|---|---|
| `docs/analisis-api-enertech-vs-at.md` | Comparativa AT vs Enertech, conmutador, estrategia de BD, preguntas abiertas |
| `docs/BIENVENIDA-NUEVA-API.md` | Guía de arranque oficial de la API Enertech |
| `docs/sync-at-supabase.md` | Cómo entra AT, tablas, locks, reglas de no-pisado (hoy sin commitear) |
| `docs/preguntas-merge-erp-web.md` | Decisiones de negocio ERP↔web (leads, roles, tarifas, contratos) |
| `docs/arquitectura-refactor.md` | Estructura objetivo (api/, pages/, hooks) respecto al estado actual |
| `docs/comparador-invoice-ai-api.md`, `…-ocr-roadmap.md`, `…-verificacion-manual.md` | IA/OCR de facturas |
| Web: `EnerSave/AUDITORIA.md`, `docs/tarifas-catalogo-pendientes.md` | Deuda y duplicados de tarifas web |

## 12. Registro de cambios (más reciente arriba)

- 2026-10-09 — Aplicado/desplegado a remoto (con confirmación del dueño) todo lo de las dos entradas de abajo: migraciones `20261009134248_rls_wrap_auth_uid_initplan.sql`, `20261009134256_function_search_path_hardening.sql` y `20261009134429_enertech_webhook_events.sql` aplicadas (renombradas de sus timestamps originales a los que `apply_migration` les asignó realmente, para que el historial local coincida con el remoto); Edge Function `enertech-contract-webhook` desplegada (`ACTIVE`, `verify_jwt=false`). Advisors confirmados en verde para `auth_rls_initplan` y `function_search_path_mutable`. El webhook devuelve `500` hasta que se le configure `ENERTECH_WEBHOOK_SECRET` con el secreto real de Enertech (pendiente: dárselo la URL, que nos den el secreto, y confirmar el nombre de la cabecera de firma).
- 2026-10-09 — Rendimiento/seguridad de RLS (advisors de Supabase): migración `rls_wrap_auth_uid_initplan` reescribe (con `ALTER POLICY`, sin tocar `USING`/`WITH CHECK` ya optimizados con `private.*()`) las 9 políticas con `auth.uid()`/`auth.jwt()` sin envolver en `(select ...)` (`auth_rls_initplan`); migración `function_search_path_hardening` fija `search_path` en las 13 funciones que lo tenían mutable (`function_search_path_mutable`), sin cambiar su lógica. Revisados también `rls_enabled_no_policy` (`at_sync_locks`/`enertech_sync_locks`/`enertech_sync_state`: intencionado, son tablas internas de sync sin acceso de cliente, deniegan todo por defecto) y los `SECURITY DEFINER` ejecutables por `anon`/`authenticated` (son las RPC públicas de leads/web a propósito, no se tocan). `auth_leaked_password_protection` (WARN) es un ajuste de Auth en el dashboard, no SQL — pendiente de decisión del dueño.
- 2026-10-09 — Receptor del webhook de cambio de estado de Enertech: Edge Function `enertech-contract-webhook` + tabla de log `enertech_webhook_events`. Verifica `HMAC-SHA256` sobre el cuerpo crudo (cabecera y secreto configurables por variable de entorno, ver §9) y registra cada entrega; no actualiza `contratos_equipo` todavía porque no hay mapeo contrato-Enertech↔contrato-ERP (decisión de no mirrorizar `enertech_contratos`, ver entrada de ayer).
- 2026-10-09 — Catálogo Enertech (comercializadoras/tarifas-acceso/precios/comisiones) activado en producción: `erp_settings.enertech_sync_enabled = true`, las 4 Edge Functions ya desplegadas con datos reales (sincronizadas el 8-10). Decisión del dueño: `enertech-sync-clientes`/`enertech-sync-contratos` **no se despliegan** (duplicarían `clientes`/`contratos_equipo`, cero duplicidad); sus cron jobs se dejaron creados pero `active=false`, no borrados. `enertech-sips-lookup` sigue sin desplegar (nadie lo ha pedido en vivo). Corregidas en §8 notas desactualizadas: las migraciones del espejo Enertech sí están aplicadas (no "ninguna aplicada" como decía antes). Confirmado que la API de Enertech no tiene webhook de catálogo (solo de cambio de estado de contrato), así que el cron es la única vía de refresco para tarifas/precios/comisiones.
- 2026-10-08 — AT: decisión del dueño por la opción "congelar con corte limpio" (§9). Retirado del repo todo el código de sync/outbound/reactivación de AT: 11 Edge Functions (`ate-webhooks`, `sync-{clients,comparisons,contracts,emails,incidents,liquidations,marcos,tariffs}-at`, `at-contract-notes`, `push-contract-at`) + sus helpers compartidos; cliente ERP (`at-api-toggle`, `at-outbound-map`, `at-api-disabled`, `AtApiSettingsProvider`, `use-at-outbound-settings`, `use-at-contract-notes`, `push-contract-at.ts`, `at-contract-notes.ts`, `at-ftp.ts`, `erp-settings.ts`); switch "API AT activa/apagada" del sidebar; rama AT del explorador de FTP (nunca tuvo backend propio en este repo — carpeta siempre vacía). Lo que queda: columnas/tablas `at_*` y las pantallas que solo las leen (Historial/Incidencias/Documentos/Notas, comparativas, emails) como histórico de solo lectura permanente, sin ningún refetch contra AT. **Pendiente manual en Supabase (no ejecutado, es acción de despliegue/infra):** las 11 Edge Functions de arriba siguen `ACTIVE` en el proyecto aunque ya no tengan código fuente en el repo ni nada que las llame (ningún cron las invoca hoy) — borrarlas requiere orden explícita.
- 2026-10-08 — CRUD manual de Marco Retributivo contra `enertech_comisiones` (restringido a `superadmin`/`tramitacion` por RLS, migración `20261008120000_enertech_comisiones_manual_crud.sql`): nueva columna `source` (`'api'`/`'manual'`), motor de sync (`enertech-sync-engine.ts`) corregido para excluir filas `source='manual'` de su detección de "desaparecidas del feed" (si no, una fila creada a mano se habría borrado en el siguiente sync de comisiones). Edición/borrado de filas de la API siguen siendo sobreescritas/restauradas por el próximo sync — los datos de Enertech prevalecen siempre. Botones de crear/editar/borrar de la UI no necesitaron cambios: ya estaban condicionados a `canEdit` (ocultos, no solo deshabilitados), solo fallaban porque las mutaciones apuntaban a la tabla archivada.
- 2026-10-08 — Marco retributivo pasa a leer `enertech_comisiones` (agrupado por campaña+tarifa, un tramo por fila) en vez de devolver vacío. `enertech_comisiones.company_id` rellenado por comparación con `marco_retributivo_legacy_archive` (~53% de cobertura, 16 compañías; el resto son productos sin histórico manual, compañía desconocida de verdad). Mutaciones (crear/editar/borrar) siguen retiradas. **Pendiente**: ocultar los botones de crear/editar/borrar en la UI de Marco Retributivo (siguen visibles, solo fallan al usarlos).
- 2026-10-08 — Consolidación Enertech-only: `providers`/`tariffs`/`tariff_prices`/`marco_retributivo` archivadas (`*_legacy_archive`, no borradas); `enertech_comercializadoras`/`enertech_precios` ampliadas con columnas de curación del ERP (`logo_url`/`is_active`, `web_visible`/`erp_active`/`web_alias`/`segment`/etc.); RPC `list_tariffs_catalog_v1` y `update_tariff_web_settings_v1` reescritas sobre Enertech (`update_tariff_web_settings_v1` ahora con `p_tariff_id text`, no `uuid`); `src/lib/supabase/tariffs.ts`, `tariffs-catalog.ts` y `marco-retributivo.ts` reescritos/blindados para no depender de las tablas archivadas. Decisión del dueño: AT descartado por completo (§9), incluidos datos manuales del ERP que no coincidían con Enertech. **Pendiente**: sustituto de `marco_retributivo` sobre `enertech_comisiones` (grano distinto, sin diseñar aún — pantalla de Marco Retributivo queda vacía mientras tanto, sin crashear); retirar en commit `refactor(at):` separado el código de sync AT que ya no se usa; avisar/arreglar el catálogo de tarifas de la web pública (`EnerSave`), que lee las mismas tablas ahora archivadas.
- 2026-10-06 — Espejo Enertech con prefijo `enertech_` (6 tablas + sips + sync/log/locks), 7 Edge Functions de sync con cron, flag `enertech_sync_enabled`, smoke script y tests con Supabase simulado. SIPS renombrada a `enertech_sips_consultas` / `enertech-sips-lookup`. Todo sin aplicar/desplegar.
- 2026-10-06 — Pantalla SIPS implementada (lib + tests, Edge Function `enertech-sips-lookup`, migración `enertech_sips_consultas`, UI `/erp/sips`, sidebar y permisos). Pendiente: aplicar migración, secret, deploy y prueba con clave `devintranet`.
- 2026-10-06 — Análisis API Enertech vs AT (`docs/analisis-api-enertech-vs-at.md`); §9 y §11 actualizados. Sin cambios de código ni de BD.
- 2026-10-06 — Creación de AGENTS.md a partir de un recorrido del repo ERP y del repo web. API AT: pausada, decisión de limpieza/congelado pendiente (§9).
- 2026-10-01 — `drop_at_catalog` y retirada del catálogo AT del wizard de contrato (`a990792`).

## 13. Gotchas

- La BD **es producción de la web también**. Una query de prueba contra remoto toca datos reales.
- Tarifas AT entran con `web_visible=false`; pueden coexistir duplicados seed-manual vs AT con precios distintos (ver `EnerSave/docs/tarifas-catalogo-pendientes.md`). Dedup en `lib/tariff-catalog-dedup.ts` y `lib/marco-dedup.ts`.
- Los precios se muestran a 4 decimales en el ERP (`formatPrecioEnergia/Potencia`); la web aún formatea a 2.
- `vite.config.ts` inyecta `GEMINI_API_KEY`/`SUPABASE_*` vía `define`: no añadas ahí claves privadas.
- Varios ficheros de `lib/supabase/` devuelven `Result` (`{ok:true,data}|{ok:false,message}`) en vez de lanzar; respeta el patrón.
- `supabase/scripts/*.sql` son diagnósticos/arreglos puntuales, no migraciones.
- Los tests solo corren en `node`: nada de DOM ni componentes; testea la lógica extraída a `lib/`.
