# Análisis: API Enertech (aenergetic) vs API AT Enterprise

Fecha: 2026-10-06. Fuentes: `docs/BIENVENIDA-NUEVA-API.md`, `https://intranet.enertechcore.com/v1/openapi.json` (leído entero), código de AT en `supabase/functions/`. **No se ha llamado a la API nueva con credencial** (no tenemos clave): los puntos marcados ⚠ son lo que no se puede saber sin ella o sin que Enertech lo confirme.

> **Actualización 2026-10-06 — decisión tomada:** para los datos de la API Enertech se usan **tablas y Edge Functions propias con prefijo `enertech_` / `enertech-`**, sin mezclarlas con las tablas de AT (`providers`, `tariffs`, `contratos_equipo`…). Esto sustituye al §4.1–4.2 (`external_provider`/`external_id`/`external_refs`) para estos datos; el cruce con las tablas núcleo del ERP (qué tarifa de Enertech equivale a cuál nuestra, qué contrato…) queda como paso posterior y se hará sobre estos espejos. El `actualizado_en` de la API cambia ante cualquier modificación de la fila (confirmado por el usuario). Detalle de implementación en `AGENTS.md` §9.

## 1. Resumen ejecutivo

- **Es viable tener las dos y alternar desde superadmin**, pero no como un interruptor que "cambia de fuente" sobre las mismas filas. Hay que sellar cada fila con su proveedor y que el interruptor solo decida quién escribe a partir de ahora.
- **La API nueva no sustituye a AT por completo.** Cubre catálogo, comisiones, contratos, clientes, SIPS y documentación. **No expone** incidencias, liquidaciones, comparativas, emails, notas ni FTP, que hoy sí vienen de AT.
- **Los ids no son compatibles**: AT usa UUID, Enertech enteros (`id_contract`, `clientId`, `id` de tarifa) y una clave `tf_…`. Las columnas `at_*_id uuid` no pueden guardarlos.
- **Recomendación para la BD:** no borrar, no duplicar tablas. Migración **aditiva** (expandir): marcar la procedencia de cada fila y guardar los ids externos en un formato neutro, dejando las columnas `at_*` intactas hasta el final (ver §4).

## 2. Diferencias

| Aspecto | AT Enterprise (`api.at-enterprise.es/v1`) | Enertech/aenergetic (`intranet.enertechcore.com/v1`) |
|---|---|---|
| Alcance de datos | Dominios: products, marcos, clients, contracts, contract_incidents/incidents, liquidations, comparisons, emails, notas de contrato, FTP | Perfil, estados, comercializadoras, tarifas de acceso, precios, comisiones, contratos, clientes, SIPS, documentación exigida, webhooks, ofertas |
| Visibilidad | Lo que cubra la clave de AT | **Cada credencial ve solo SUS clientes y contratos** |
| Ids | UUID | Enteros (`id_contract`, cliente, `id` de precios) + `clave` `tf_`+16 hex |
| Estado de contrato | `draft, requested, pending_sign, verified, sent, signed, in_review, active, incident, ended…` (mapeo en `AT_STATUS_TO_ERP`) | 10 ids fijos: 1 Pte RGPD · 2 Pte carga · 3 Pte firma · 4 En trámite · 5 Activo · 6 Incidencia · 7 Caducado · 8 Baja · 9 Cancelado · 10 Futuras captaciones |
| Comisiones | **No las traía** (`sync-marcos-at` no llama a `/marcos/commissions`; la comisión es del ERP) | **`GET /comisiones`**, ya calculada para el perfil de la credencial |
| Precios | `products` → `tariff_prices` | `GET /precios` (filas con `id` estable, `clave`, `actualizado_en`; resto de campos libres ⚠) |
| Webhooks | Un receptor `ate-webhooks`, 8 familias de evento (`product.*`, `contract.*`, `liquidation.*`…), secretos por dominio | **Un solo evento: cambio de estado de contrato.** Firma `X-Aenergetic-Signature: sha256=HMAC(secret, timestamp + "." + cuerpo)`, hasta 6 reintentos; el alta del webhook la hacen ellos; reconciliar con `GET /contratos?modificado_desde=` |
| Alta ERP→proveedor | `push-contract-at` (cliente + contrato) | `POST /clientes` + `POST /contratos`; `Idempotency-Key`; `cnae` obligatorio; documentos en base64; el contrato puede nacer en incidencia si faltan documentos |
| Auth | Clave AT | `X-Api-Key` o JWT 1 h (`POST /auth/token`) |
| Límites | Retry 429 propio en `at-api.ts` | 120 req/min por credencial, `Retry-After` |
| Entornos | — | Producción y `devintranet.enertechcore.com` (clave distinta, correos apagados) |
| Extras nuevos | — | SIPS (potencias, consumo anual, CNAE, distribuidora), matriz de documentación por segmento, puente `GET /ofertas` |

Qué se pierde si AT desaparece del todo: incidencias, liquidaciones externas, comparativas, emails/notas de contrato, FTP de AT. Qué se gana: comisiones por API, SIPS, documentación exigida, idempotencia.

## 3. ¿Es viable tener las dos con un conmutador de superadmin?

Sí, con estas reglas (si no, se pisan datos):

1. **Proveedor activo único para escritura.** Estados: `at` · `enertech` · `none` (hoy `none`, vía `erp_settings.at_outbound_enabled=false`). Activar uno desactiva el otro. Nunca dos escribiendo a la vez.
2. **Cada fila pertenece al proveedor que la creó.** El sync de un proveedor solo actualiza/desactiva filas con su sello (mismo principio que ya usamos con `at_*_id null` = alta del ERP).
3. **Cambiar de proveedor es "hacia delante"**: un contrato enviado a AT no se puede actualizar por Enertech. Los contratos antiguos quedan como histórico del proveedor viejo; los nuevos nacen en el activo.
4. **Webhooks: dos receptores independientes** (`ate-webhooks` existente + uno nuevo para Enertech), cada uno comprueba el flag de su proveedor y responde 200 sin escribir si no es el activo (como ya hace AT).
5. **Credencial = visibilidad.** Una sola clave de Enertech solo ve lo de esa cuenta. Hay que aclarar si basta una clave "casa" o hace falta una por comercial (⚠ pregunta 4).
6. **Los dominios sin equivalente** (incidencias, liquidaciones, comparativas, emails, FTP) no se conmutan: o quedan congelados con lo último de AT, o pasan a gestión manual en el ERP, o Enertech los añade ⚠.

Implementación coherente con SOLID: interfaz por dominio en `supabase/functions/_shared/` (`CatalogProvider`, `ContractGateway`, `ContractEventSource`) con dos adaptadores (`at`, `enertech`) y un resolvedor que lee el proveedor activo. Hoy las funciones `sync-*-at` llaman a AT directamente.

## 4. Qué hacer con la BD

Se descartan dos extremos:

- **Borrar todo lo de AT:** destructivo e irreversible sobre una BD que comparte la web; se pierde el histórico (contratos con su id AT, liquidaciones, comparativas) y no hay equivalente en Enertech para varios dominios. Solo tiene sentido al final, tablas ya vacías de uso.
- **Tablas paralelas para Enertech** (`tariffs_enertech`, `contratos_enertech`…): duplica el catálogo, obliga a UNIONs en el comparador del ERP, en el de la web y en liquidaciones. Mala idea.

**Recomendado: patrón expandir → migrar → contraer.**

### 4.1 Entidades transaccionales (las posee un proveedor)
`contratos_equipo`, `incidencias`, `settlements`, y también `clientes` aunque en la práctica se identifique por NIF.

Añadir columnas (migración aditiva, sin tocar `at_*`):

- `external_provider text check (external_provider in ('manual','at','enertech'))`
- `external_id text` (texto: cabe UUID o entero)
- `external_synced_at timestamptz`
- índice único parcial `(external_provider, external_id) where external_id is not null`

Backfill: filas con `at_*_id not null` → `external_provider='at'`, `external_id = at_*_id::text`; el resto → `'manual'`. Los syncs de AT siguen funcionando con las columnas viejas durante la transición.

### 4.2 Entidades de catálogo (una realidad, varios nombres)
`providers` (comercializadoras) y `tariffs`: la misma comercializadora/tarifa existe en AT y en Enertech. **No duplicar filas**; una fila por realidad comercial y una tabla puente:

`external_refs(entity text, entity_id uuid, provider text, external_id text, external_key text, synced_at timestamptz, unique(entity, provider, external_id))`

- Backfill desde `at_company_id`, `tariffs.at_rate_id`, `marco_retributivo.at_marco_id`.
- Emparejar Enertech ↔ filas existentes: comercializadoras por nombre normalizado (hay `lib/resolve-compania-marco-tarifa.ts` y `tariff-catalog-dedup.ts` para reutilizar criterios); tarifas por comercializadora + tarifa de acceso + nombre de oferta, usando `GET /ofertas` como ayuda. Lo que no empareje se crea nuevo con `source` del proveedor y se revisa a mano. Hay que evitar el problema ya documentado de duplicados seed-vs-AT (`EnerSave/docs/tarifas-catalogo-pendientes.md`).
- **Precios (`tariff_prices`)**: una sola fuente por tarifa. Añadir `tariffs.price_provider` (`at|enertech|manual`); el sync solo escribe precios de las tarifas cuyo `price_provider` es él o las que reclame explícitamente al emparejar. Así no hay carrera de precios entre fuentes. El comparador (ERP y web) sigue leyendo solo `tariff_prices`.

### 4.3 Comisiones
`marco_retributivo` sigue siendo **del ERP**. `GET /comisiones` es un dato nuevo: llevarlo a una tabla de **staging** (`provider_commissions`: proveedor, `clave`, `id`, payload, `actualizado_en`) y mostrar diferencias frente al marco; adoptar a mano o con aprobación de superadmin. No sobrescribir comisiones automáticamente: la comisión de la credencial no es la del reparto interno por comercial (`erp_comerciales.commission_percentage`).

### 4.4 Tablas solo-AT (sin equivalente)
`at_comparisons`, `at_email_logs`, `at_contract_notes`, `at_contract_prices`, `contratos_equipo.at_documents/at_emails/at_notes/at_events/at_payload`: **se congelan** (solo lectura, UI marcada como "histórico AT"). No se tocan hasta decidir en el contraer.

### 4.5 Contraer (más adelante, con orden expresa)
Cuando Enertech esté estable y se confirme que AT no vuelve: migrar el código a `external_*`, retirar las funciones `sync-*-at` y los flags, y decidir si `at_*` se archiva o se elimina. Cada paso en su migración.

### 4.6 Seguridad del cambio
BD compartida con la web: antes de aplicar nada en remoto, probar en una rama de Supabase (`create_branch`), no tocar `leads` ni `facturas`, y confirmar con el usuario cada `apply_migration`.

## 5. Mapeo de estados (propuesta, a validar)

| ERP (`contratos_equipo.estado`) | Enertech |
|---|---|
| Borrador | — (solo ERP) |
| PTE DE FIRMA | 1 Pte RGPD, 3 Pte firma |
| PTE DE TRAMITACIÓN | 2 Pendiente de carga |
| TRAMITANDO | 4 En trámite |
| ACTIVADO | 5 Activo |
| INCIDENCIA ADMINISTRATIVA | 6 Incidencia (`ContratoResumen.incidencia` trae el texto) |
| Dado de Baja | 7 Caducado, 8 Baja, 9 Cancelado |
| (sin equivalente) | 10 Futuras captaciones ⚠ |

Guardar siempre el id numérico original (`external_status`) para no perder matices. Se respeta `manual_overrides.estado`.

## 6. Preguntas que bloquean el diseño final

1. **¿AT y Enertech son el mismo CRM?** El ERP ya importa `CRM_Aenergetic.xlsx` y la API se llama "aenergetic". Si lo son, un mismo contrato existirá con id UUID (AT) e id entero (Enertech) y habrá que casarlos por CUPS+NIF. Si son distintos, son universos separados.
2. **¿AT se apaga para siempre o puede volver?** Define si hace falta el conmutador o basta con una migración definitiva.
3. **¿De dónde saldrán liquidaciones, incidencias y comparativas?** Enertech hoy no las ofrece.
4. **¿Una credencial "casa" o una por comercial?** Determina qué contratos se ven.
5. **Payload del webhook** y formato exacto de las filas de `/precios` y `/comisiones` (el OpenAPI las deja abiertas).
6. **Clave del entorno de pruebas** (`devintranet`) para desarrollar sin tocar producción.
7. **Pantalla SIPS:** ¿qué roles pueden consultar y cuál es la cuota mensual de consultas nuevas?
8. **¿Quién puede conmutar?** Hoy solo el superadmin con `AT_OUTBOUND_OWNER_EMAIL`; ¿se mantiene para Enertech?

## 7. Plan por fases

0. Respuestas a §6 y una clave de pruebas.
1. Migración aditiva `external_*` + `external_refs` + backfill desde `at_*` (en rama de Supabase). Sin cambios de comportamiento.
2. Abstracción de proveedor en `_shared/`; AT pasa a ser un adaptador. `erp_settings.active_provider`. UI del conmutador en superadmin.
3. Adaptador Enertech de **solo lectura** contra `devintranet`: comercializadoras, precios, comisiones (staging), contratos y estados por `modificado_desde`.
4. Webhook receptor Enertech (firma, idempotencia por evento) + reconciliación periódica.
5. Alta saliente (`POST /clientes` + `/contratos`) con `Idempotency-Key`, `cnae`, documentos y consulta previa a `/documentacion`.
6. Corte a producción y fase de contraer (§4.5).

## 8. Pantalla nueva: SIPS (consulta de CUPS)

Funcionalidad **nueva, solo de Enertech** (`GET /sips?cups=&producto=`). AT no tiene equivalente, así que **no depende del conmutador de proveedor** (§3): se puede construir ya, en paralelo a la migración, con un flag propio de "SIPS activo".

### Qué devuelve la API
- `200 estado: listo` → usar **`resumen`** (nunca `datos`, que es crudo y cambia según `origen`): `cups`, `tarifa` (ATR), `potencias_kw` (P1..P6), `consumo_anual_kwh`, `codigo_postal`, `provincia`, `municipio`, `distribuidora`, `cnae`; más `origen` y `consultado_en`.
- `202 estado: procesando` + `reintentar_en` (~30 s) → repetir **la misma llamada**.
- `200 estado: sin_datos` → definitivo; no reintentar hasta pasadas 24 h.
- `400` CUPS ausente/mal formado, `401` credencial, `429` con `Retry-After`. Errores siempre con `code` estable.
- Caché de 30 días en el proveedor; la mayoría responde en 2-4 s (tope 8 s). Parámetro `producto=gas` para gas; por defecto luz.
- Hay **cuota aparte para consultas SIPS nuevas** además de 120 req/min ⚠ (cifra a confirmar con Enertech).

### Diseño
- **La clave nunca va al navegador.** Nueva Edge Function `enertech-sips-lookup` (verify_jwt = true) que valida sesión y permiso, llama a Enertech con `ENERTECH_API_KEY` (variable de la función) y devuelve solo `resumen`. Adaptador en `_shared/` coherente con §3.
- **Ruta y navegación:** pestaña `SIPS` en el módulo ERP (`/erp/sips`): `constants/navigation.ts` → `pages/erp/routes/sips.tsx` → `lib/router.tsx` + `lib/workspaceModuleRegistry.ts` + `lib/workspaceAccess.ts`.
- **Permisos:** decidir si basta `comparatorAccess` o se crea `sipsAccess` en `Profile.permissions`. La cuota es compartida y de pago, así que conviene restringir por rol y registrar quién consulta.
- **UI (usar `/frontend-design`):** campo CUPS con normalización (mayúsculas, sin espacios; reutilizar `useNoSpacePasteInput` y `paste-format`), validación local de formato y letra de control **antes** de gastar una consulta, selector luz/gas, estados de carga/"procesando…" con cuenta atrás de `reintentar_en`, tarjeta de resultado con potencias P1–P6, consumo, ATR, CNAE, distribuidora y ubicación, indicador de `origen`/`consultado_en` y botón de refrescar deshabilitado cuando sea `sin_datos` (24 h).
- **Valor real:** acciones desde el resultado → **"Crear contrato"** (precarga el wizard: ATR, potencias, consumo, CP/población/provincia, CNAE; el `cnae` es obligatorio en el alta Enertech) y **"Comparar tarifas"** (precarga el comparador con ATR, potencias y consumo anual).
- **Datos:** tabla `enertech_sips_consultas` (`id`, `cups`, `producto`, `estado`, `resumen jsonb`, `origen`, `consultado_en`, `solicitado_por`, `created_at`) con RLS (cada usuario ve las suyas; jefe, las de su equipo; superadmin todas). Sirve de histórico, de caché interna para no repetir consultas y de control de cuota. No guardar el `datos` crudo.
- **Datos personales:** el CUPS y los datos de suministro son personales; el log y la RLS lo tratan como tal y no se muestra en logs técnicos.
- **Tests (Vitest, lógica en `lib/`):** validación/normalización de CUPS, mapeo `resumen` → formulario de contrato/comparador, máquina de estados `listo/procesando/sin_datos`, política de reintento.

### Fases (encaja tras la fase 0 del §7, independiente del resto)
S1. Clave de pruebas (`devintranet`) y contrato de la cuota SIPS. S2. `lib/sips/` (validación, mapeo, estados) con tests. S3. Edge Function `enertech-sips-lookup` + tabla `enertech_sips_consultas` (migración aditiva, en rama). S4. Pantalla `/erp/sips`. S5. Acciones "Crear contrato" / "Comparar tarifas".
