# Sync con AT Enterprise y tablas de Supabase

Cómo entra la información de AT al ERP, qué tabla es de quién y qué no se pisa.

Proyecto Supabase: `unxrvwuaqhwogwvynoyq`. API de AT: `https://api.at-enterprise.es/v1`. El código de las funciones está en `supabase/functions/`.

Hay dos sentidos:

- **Entrada.** AT avisa con un webhook, o se lanza un sync a mano. La función lee la API de AT y escribe en Postgres.
- **Salida.** El ERP empuja un contrato hacia AT con `push-contract-at`. Eso no rellena tarifas ni comisiones.

La app (React) lee y escribe con el usuario de Supabase y sus políticas RLS. Las funciones de sync usan la **service role**: no pasan por RLS. Por eso el sync tiene que limitar él mismo qué filas toca.

## Webhook

Un solo receptor: `ate-webhooks`.

URL: `…/functions/v1/ate-webhooks`.

AT manda un POST. La función mira el nombre del evento y llama al sync que toca. Si el evento no está en la tabla, responde ok y no escribe nada. `webhook.test` dispara el sync de contratos.

| Evento | Función | Qué escribe |
|---|---|---|
| `product.*` | `sync-tariffs-at` | `providers`, `tariffs`, `tariff_prices` |
| `marco.*` | `sync-marcos-at` | solo el enlace de `marco_retributivo` que ya existe y es de AT |
| `client.*` | `sync-clients-at` | `clientes` con `source = 'at'` |
| `contract.*` | `sync-contracts-at` | `contratos_equipo` |
| `contract_incident.*`, `incident.*` | `sync-incidents-at` | `incidencias` |
| `liquidation.*` | `sync-liquidations-at` | `settlements` |
| `comparison.*` | `sync-comparisons-at` | `at_comparisons` |
| `email.*` | `sync-emails-at` | `at_email_logs` |

Cada función también se puede llamar sola, con `mode=explore` (mira la API y no escribe) o `mode=sync` (escribe).

Auth del webhook: firma HMAC (`x-ate-*` o cabeceras tipo Svix) o un secreto en `Authorization` / `x-webhook-secret`. Los secretos están en las variables de la función (`AT_TARIFFS_SYNC_SECRET`, `AT_MARCOS_SYNC_SECRET`, y el resto por dominio). La clave para leer AT es `AT_ENTERPRISE_API_KEY`.

Si la API de AT está pausada, el webhook responde ok y no sincroniza. El ERP sigue con la última copia local.

Dos syncs del mismo tipo no corren a la vez. El candado está en `try_acquire_at_sync_lock` (unos 8 minutos). Si llega otro mientras, se salta.

## Cómo se evita pisar lo que hemos creado nosotros

La regla es la clave externa.

- Si la fila tiene id de AT (`at_rate_id`, `at_client_id`, `at_contract_id`…), el sync puede actualizarla.
- Si ese id es null, es alta del ERP. El sync no la actualiza ni la desactiva.
- El sync solo desactiva filas **suyas** que ya no vienen en la última lectura (`source = 'at'` y `at_synced_at` anterior).

Eso vale para tarifas, clientes y marcos. Una tarifa o un cliente de una compañía que no está en AT se crea sin esos ids.

## Tarifas y marco retributivo

Es el mismo producto en dos tablas. Cambia el dueño.

| Pantalla | Tabla | Qué guarda | Quién manda |
|---|---|---|---|
| Tarifas | `providers` + `tariffs` + `tariff_prices` | Compañía, nombre, luz/gas, peaje, segmento, precios de energía y potencia | AT si hay `at_rate_id`. ERP si `at_rate_id` es null |
| Marco retributivo | `marco_retributivo` | La misma tarifa, más comisión, tramo de consumo (kWh/año) y permanencia | Siempre el ERP |

Enlace: `marco_retributivo.tariff_id` → `tariffs.id`.

`sync-tariffs-at` hace upsert de compañía por `at_company_id`, de tarifa por `at_rate_id`, y reescribe `tariff_prices` solo de esas tarifas (clave `tariff_id` + periodo). Una tarifa AT entra con `web_visible = false` hasta que se publica en el ERP. Las tarifas sin `at_rate_id` no se tocan.

`sync-marcos-at` **no trae la comisión de AT** y no llama a `/marcos/commissions`. No crea filas nuevas. En una fila que ya es `source = 'at'` solo refresca `tariff_id`, `at_rate_id` y `at_synced_at`. Comisión, tramos y condiciones se cargan en el ERP.

Un alta o un guardado de comisión deja `source = 'manual'` y `at_marco_id` null, para que el siguiente sync no la reclame.

Cómo dar de alta una tarifa que no está en AT:

1. `providers` sin `at_company_id`.
2. `tariffs` sin `at_rate_id`.
3. Precios solo en `tariff_prices`.
4. Marco `source = 'manual'`, sin `at_marco_id`, con `tariff_id` de esa tarifa, tu comisión y tus tramos.

Si la tarifa sí está en AT, no se crea otra fila de tarifa. El sync actualiza ficha y precios. La comisión va en un marco manual enlazado por `tariff_id`.

No rellenar `at_rate_id` ni `at_marco_id` a mano: el sync hace match por esas claves.

El comparador calcula el coste con `tariff_prices`. No usa `energia_p1`…`p6` ni `potencia_p1`…`p6` del marco. Esas columnas quedan vaciadas por `supabase/migrations/20260928190000_marco_precios_no_fuente.sql` (hay que aplicarla en el proyecto; la conexión no llegó a ejecutarla).

Si el mismo nombre existe como tarifa manual y como tarifa AT, se desactiva la manual en el ERP (`erp_active = false`) y se queda la de AT, que es la que trae el precio. En el marco, si hay duplicado de nombre, se queda la fila manual.

## Resto de tablas que mueve el sync

| Tabla | Clave de AT | Qué hace el sync |
|---|---|---|
| `clientes` | `at_client_id` | Inserta los nuevos. Actualiza solo `source = 'at'`. Si el NIF ya existe en una ficha sin id de AT, solo le engancha el id; no reescribe el resto. No desactiva fichas manuales. |
| `contratos_equipo` | `at_contract_id` | Upsert del contrato. Puede enlazar cliente, tarifa y marco que ya existan. No importa la comisión del marco. |
| `incidencias` | `at_incident_id` | Upsert. |
| `settlements` | `at_liquidation_id` | Liquidaciones que vienen de AT. La comisión interna del comercial se calcula en el ERP a partir del marco manual (`sync-marco-settlements`), no se copia de AT. |
| `at_comparisons` | `at_comparison_id` | Comparativas hechas en AT. |
| `at_email_logs` | `at_email_id` | Correos ligados a contratos. |

`user_profiles` no se sincroniza desde AT. El usuario es el de Supabase Auth. El perfil (rol, porcentaje de comisión del comercial) es del ERP.

## Salida hacia AT

`push-contract-at` la llama un usuario del ERP ya autenticado, no el webhook. Lee el contrato en `contratos_equipo`, lo traduce y lo envía a la API de AT. Tiene su propio interruptor (`at-outbound`). No crea tarifas ni cambia el marco.

## Qué queda fuera de este circuito

- Comisión, tramos y condiciones del marco.
- Precios de una tarifa creada en el ERP (sin `at_rate_id`).
- Porcentaje de comisión del comercial.
- Leads de la web y el pipeline de ventas: viven en sus tablas y no pasan por `ate-webhooks`.

Para que el cambio del marco esté en el servidor hay que volver a desplegar `sync-marcos-at` en `unxrvwuaqhwogwvynoyq`. Hasta entonces, la función que hay desplegada puede seguir siendo la anterior.
