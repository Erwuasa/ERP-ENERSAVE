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
  providers/              # AppProviders (router+tema), ErpDataProvider, AtApiSettingsProvider, ContractActionsProvider
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

- **Auditoría webhooks Enertech:** `/erp/enertech-webhooks` (`pages/erp/enertech-webhooks/`, `lib/supabase/enertech-webhook-events.ts`, tabla `enertech_webhook_events`). Solo lectura. Visible para tramitación y superadmin dueño (`AT_OUTBOUND_OWNER_EMAIL`, hoy `germanbayonr@gmail.com`); acceso en `lib/enertech-webhook-audit-access.ts`.

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

Detalle completo en `docs/sync-at-supabase.md`. Resumen:

| Pantalla | Tabla | Dueño del dato |
|---|---|---|
| Tarifas | `providers` + `tariffs` + `tariff_prices` | AT si `at_rate_id` no es null; ERP si es null |
| Marco retributivo | `marco_retributivo` (comisión, tramos kWh/año, permanencia) | **Siempre el ERP** |

- Enlace `marco_retributivo.tariff_id → tariffs.id`.
- Precios para el comparador: **solo `tariff_prices`** (las columnas `energia_p*`/`potencia_p*` del marco están vaciadas por `20260928190000_marco_precios_no_fuente.sql`).
- Altas manuales: `source='manual'`, `at_marco_id` null, `at_rate_id` null. **Nunca rellenes `at_*_id` a mano**: el sync hace match por esas claves.
- Regla de oro de cualquier sync: solo toca filas con id externo; las altas del ERP (id externo null) no se actualizan ni se desactivan.

## 9. API AT Enterprise — ESTADO: PAUSADA, decisión pendiente

**Nueva API:** Enertech/aenergetic (`https://intranet.enertechcore.com/v1`, guía en `docs/BIENVENIDA-NUEVA-API.md`). Análisis de diferencias, viabilidad del conmutador y estrategia de BD en **`docs/analisis-api-enertech-vs-at.md`** (léelo antes de tocar nada de integración). Resumen: se recomienda conmutador con proveedor activo único + migración aditiva (`external_provider`/`external_id` + tabla `external_refs`), sin borrar datos AT. La API nueva NO cubre incidencias, liquidaciones, comparativas, emails ni FTP.

**Espejo de la API Enertech — DECISIÓN TOMADA (2026-10-06): tablas y Edge Functions propias con prefijo `enertech_` / `enertech-`, separadas de las de AT. No se mezclan con `providers`/`tariffs`/`contratos_equipo`/`clientes`.** Sustituye a la propuesta de `external_*` + `external_refs` del análisis (§4) para estos datos. Código listo, **sin aplicar ni desplegar ni probado contra la API real** (no hay clave aún).

| Endpoint Enertech | Tabla | Edge Function | Cron |
|---|---|---|---|
| `GET /comercializadoras` | `enertech_comercializadoras` | `enertech-sync-comercializadoras` | diario 03:00 |
| `GET /tarifas-acceso` | `enertech_tarifas_acceso` | `enertech-sync-tarifas-acceso` | diario 03:05 |
| `GET /precios?todas=1` | `enertech_precios` (PK `clave`) | `enertech-sync-precios` | cada 6 h (:10) |
| `GET /comisiones?todas=1` | `enertech_comisiones` (PK `clave`) | `enertech-sync-comisiones` | cada 6 h (:20) |
| `GET /clientes` (paginado) | `enertech_clientes` | `enertech-sync-clientes` | cada hora (:30) |
| `GET /contratos` (incremental `modificado_desde`) | `enertech_contratos` | `enertech-sync-contratos` | cada 15 min |
| `GET /sips` | `enertech_sips_consultas` | `enertech-sips-lookup` | — (bajo demanda) |
| `GET /perfil` | — | `enertech-perfil` (valida la clave) | — |

- **Auditoría webhooks (ERP):** tabla `enertech_webhook_events` (lectura staff vía RLS). Pantalla `/erp/enertech-webhooks` lista eventos recibidos (firma, resumen de payload); no sustituye la Edge Function de verificación.

- Migraciones: `20261006120000_enertech_sips_consultas.sql` y `20261006130000_enertech_mirror_tables.sql` (tablas, RLS, locks, cron, flag). **Ninguna aplicada.**
- Cada tabla espejo guarda `payload` (fila cruda completa), `content_hash`, `actualizado_en`, `first_seen_at/last_seen_at/changed_at/removed_at`. Una fila cuenta como cambiada si `actualizado_en` difiere **o** el hash difiere (`_shared/enertech-diff.ts`). Los cambios quedan en `enertech_catalog_changes` (base para avisos). Las filas que desaparecen de un feed completo se marcan `removed_at`, nunca se borran; protección: no se aplican bajas tras una respuesta vacía o con menos de la mitad de filas. Contratos es incremental: nunca marca bajas; el cursor vive en `enertech_sync_state` (último `fecha_actualizacion` − 120 s).
- Motor: `_shared/enertech-sync-runner.ts` (auth, explore/sync, flag, lock, log de ejecuciones en `enertech_sync_runs`), `enertech-sync-engine.ts` (upsert + diff), `enertech-entities.ts` (una definición por endpoint), `enertech-mappers.ts` (fila cruda → columnas; **nombres de campo de comercializadoras/precios/comisiones son suposiciones tolerantes: el OpenAPI no los fija**).
- **Interruptor:** `erp_settings.enertech_sync_enabled` (por defecto `false`). El cron llama a las funciones pero responden `skipped` hasta activarlo. `?force=1` lo salta para pruebas manuales; `?mode=explore` (GET) nunca escribe y devuelve campos y muestras.
- Secretos de las funciones: `ENERTECH_API_KEY`, `ENERTECH_SYNC_SECRET` (Bearer del cron y de las pruebas), opcional `ENERTECH_API_BASE_URL` (`https://devintranet.enertechcore.com/v1` para pruebas). Vault: `select vault.create_secret('<mismo valor>', 'enertech-sync-secret', ...)`.
- **Cuando llegue la clave, en este orden:** (1) `npm run enertech:smoke` (llama a la API directa, solo lectura; añade `-- --cups=ES…` para probar SIPS, `-- --edge` para las funciones en explore) y revisa los avisos de "faltan campos"; (2) ajustar `enertech-mappers.ts` si los nombres reales difieren; (3) aplicar migraciones y desplegar funciones (con permiso expreso); (4) `?mode=sync&force=1` función a función; (5) activar `enertech_sync_enabled`.
- Tests sin API real: `src/lib/enertech/*.test.ts` (diff, mappers, extractores y motor completo con Supabase en memoria y `fetch` simulado). `npm run lint` no comprueba tipos de las Edge Functions con Deno (no hay Deno en el entorno): revisar a mano lo que no importe el test.

**Pantalla SIPS — código escrito, SIN desplegar ni probar contra la API real** (`/erp/sips`, consulta de CUPS vía `GET /sips` de Enertech). Independiente del conmutador AT/Enertech. Diseño y fases en §8 del análisis. Piezas: `src/lib/sips/` (validación CUPS, parseo, reintentos; con tests), `src/lib/supabase/sips.ts` (cliente), `src/pages/erp/sips/` (UI), `supabase/functions/enertech-sips-lookup` (+ `_shared/enertech-api.ts`, `sips-cups.ts` espejo de `lib/sips/cups.ts`: mantener sincronizados), migración `20261006120000_enertech_sips_consultas.sql` (NO aplicada). Para ponerla en marcha falta: aplicar la migración, definir `ENERTECH_API_KEY` (y opcional `ENERTECH_API_BASE_URL`, p. ej. `https://devintranet.enertechcore.com/v1`) en las variables de la función y desplegar `enertech-sips-lookup`. Reglas: la API key solo vive en esa Edge Function, usar siempre `resumen` (nunca `datos`), validar el CUPS antes de consultar, manejar `listo/procesando/sin_datos`. Permiso: reutiliza `comparatorAccess` (`canAccessSips` en `lib/staff-permissions.ts`); **tramitación lo tiene a `false` por defecto, así que no ve SIPS hasta que un superadmin se lo active** — decisión pendiente: crear `sipsAccess` propio.

**Contexto:** AT (`https://api.at-enterprise.es/v1`) fue la fuente externa de tarifas, clientes, contratos, incidencias, liquidaciones, comparativas y emails, además de destino de altas de contrato. **Se va a usar otra API a partir de ahora.** Hoy AT está apagada con un interruptor y el ERP vive de la última copia local.

### Cómo está apagada

- Flag `erp_settings.at_outbound_enabled` (fila `id=1`). Lo lee el ERP (`lib/supabase/erp-settings.ts`, `hooks/use-at-outbound-settings.ts`, `AtApiSettingsProvider`) y las Edge Functions (`_shared/at-api.ts → isAtApiEnabled`, caché 3 s). Con flag a `false`, cualquier llamada a AT lanza `AtApiDisabledError`, los webhooks responden ok sin escribir y `push-contract-at` no envía.
- Solo puede conmutarlo el superadmin con email `AT_OUTBOUND_OWNER_EMAIL` (`lib/at-api-toggle.ts`, `lib/at-outbound-map.ts`).
- Mensajes por pestaña en `lib/at-api-disabled.ts` (`resolveAtApiDisabledMessage`).
- **No reactives el flag ni borres datos AT sin orden explícita.**

### Inventario de superficie AT (para limpiar o congelar)

| Zona | Dónde |
|---|---|
| Edge Functions de entrada | `supabase/functions/ate-webhooks`, `sync-{tariffs,marcos,clients,contracts,incidents,liquidations,comparisons,emails}-at`, `at-contract-notes` |
| Edge Function de salida | `supabase/functions/push-contract-at` (ERP → AT) |
| Compartido | `supabase/functions/_shared/at-*.ts`, `sync-*.ts`, `marco-link.ts`, `sync-marco-settlements.ts` |
| Cliente ERP | `lib/supabase/{at-ftp,at-comparisons,at-emails,at-contract-notes,push-contract-at}.ts`, `lib/at-*.ts`, `hooks/use-at-*.ts`, `hooks/useFtpExplorer.ts`, `lib/ftp-sources.ts`, `components/FtpPanel.tsx`, pestañas Historial de Comparativas / Comunicaciones / FTP |
| Columnas con id AT | `tariffs.at_rate_id`, `providers.at_company_id`, `clientes.at_client_id`, `contratos_equipo.at_contract_id`/`at_rate_id`/`at_marco_id`, `marco_retributivo.at_marco_id`/`at_synced_at`/`source='at'`, tablas `at_comparisons`, `at_email_logs`, `at_contract_notes`, `at_contract_prices` |
| Infra BD | `try_acquire_at_sync_lock`, cron `sync-comparisons-at` (vault `at-sync-webhook-secret`; ver migraciones `20260901000002`, `20260903000001`, `20261001150000` — verifica en remoto si está activo) |
| Último cleanup | commit `a990792` (catálogo AT del wizard de contrato) y migración `20261001150000_drop_at_catalog.sql` |

### Opciones de decisión (a resolver con el dueño antes de borrar nada)

1. **Pausar y conservar (estado actual, recomendado hasta tener la API nueva).** Dejar código, columnas y datos. Coste: ruido y deuda. Riesgo: ninguno.
2. **Congelar con corte limpio.** Mantener columnas/datos AT como histórico de solo lectura; borrar sync functions, cron y UI de reactivación; `at_*_id` pasan a ser "legacy".
3. **Abstraer proveedor.** Introducir una interfaz (`CatalogProvider`/`ContractGateway` en `_shared/`) e implementar la API nueva detrás; AT queda como un adaptador desactivado. Es lo que encaja con SOLID si la API nueva reemplaza varios dominios.

Mientras no se decida:

- **No** añadas funcionalidad nueva dependiente de AT.
- **No** renombres/borres columnas `at_*` ni migres datos AT.
- Código nuevo que necesite "origen externo" debe usar un nombre neutro (`external_id`, `source`) o esperar a la decisión.
- Si limpias código muerto de AT, hazlo en commits separados (`refactor(at): …`), sin mezclar con features, y apunta lo retirado en §12.

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

- 2026-10-09 — Pantalla auditoría webhooks Enertech (`/erp/enertech-webhooks`, `enertech_webhook_events`, acceso superadmin dueño + tramitación).
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
