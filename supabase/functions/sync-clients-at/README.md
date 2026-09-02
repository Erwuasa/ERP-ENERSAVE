# Sync AT CRM (clientes → avisos)

Auth igual que tarifas/marcos (`AT_TARIFFS_SYNC_SECRET` / HMAC `x-ate-*`). POST dispara `sync`; GET o `?mode=explore` explora el payload.

Eventos reales de `GET /v1/webhooks/events` (sep 2026):

| Dominio | Función | Eventos a suscribir | Tabla |
|---|---|---|---|
| Clientes | `sync-clients-at` | `client.created`, `client.updated`, `client.rgpd_accepted`, `client.deleted` | `clientes` |
| Contratos | `sync-contracts-at` | `contract.created`, `contract.updated`, `contract.status_changed`, `contract.deleted` | `contratos_equipo` |
| Liquidaciones | `sync-liquidations-at` | `liquidation.updated`, `liquidation.payment_status_changed` | `settlements` |
| Incidencias | `sync-incidents-at` | `incident.created`, `incident.updated`, `incident.status_changed`, `contract_incident.created`, `contract_incident.status_changed` | `incidencias` |
| Tarifas (ya vivo) | `sync-tariffs-at` | `product.created`, `product.updated`, `product.deleted` | `tariffs` |
| Marcos (ya vivo) | `sync-marcos-at` | `marco.created`, `marco.updated`, `marco.deleted` | `marco_retributivo` |
| Emails | `sync-emails-at` | `email.logged`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.delivery_failed` | `at_email_logs` |

**Sin evento AT** → `pg_cron` + `pg_net`:

| Dominio | Función | Cron | Por qué |
|---|---|---|---|
| Catálogos | `sync-catalog-at` | `0 */6 * * *` (cada 6 h) | Enums, comercializadoras, regulatoria: casi no cambian |
| Comparativas | `sync-comparisons-at` | `20 * * * *` (cada hora, :20) | Altas durante el día; desfase para no coincidir con catálogo |

El cron llama con Bearer del vault `at-sync-webhook-secret` (mismo valor que `AT_TARIFFS_SYNC_SECRET`). Crearlo **una vez** en SQL Editor:

```sql
select vault.create_secret('<mismo Bearer que los webhooks>', 'at-sync-webhook-secret', 'cron catalog/comparisons');
```

Hasta que exista ese secret, el job falla con `Falta vault secret at-sync-webhook-secret`.

---

## Webhooks AT (`POST /v1/webhooks`)

Misma URL base. Auth HMAC `x-ate-*` o Bearer. Créalos ya con `"active": true`.

Cada webhook AT trae su propio `secret` (`whsec_…`) **solo en el POST de alta**. No pises `AT_TARIFFS_SYNC_SECRET` ni `AT_MARCOS_SYNC_SECRET`. Pega los nuevos en una sola secret:

`AT_WEBHOOK_SECRETS=whsec_clientes,whsec_contratos,whsec_liquidaciones,whsec_incidencias,whsec_emails`

(coma o salto de línea). Si perdiste un `whsec_`, rota el secret en AT o recrea ese webhook.

`active: false` **no envía nada** (ni ping). Para comprobar que llega:

1. Pull (sin webhook): `POST …/sync-clients-at?mode=sync` con Bearer.
2. Entrega AT: si la API tiene `POST /v1/webhooks/{id}/test`, manda `webhook.test` → `ate-webhooks` responde `{ ok: true }`. Si no, edita un cliente/contrato en AT y mira logs de la edge.
3. Primer volcado: un sync por dominio. A partir de ahí los webhooks mantienen el delta.

Base: `https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1`

**Clientes**

```json
{
  "url": "https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1/sync-clients-at?mode=sync",
  "events": ["client.created", "client.updated", "client.rgpd_accepted", "client.deleted"],
  "description": "ERP EnerSave — clientes",
  "active": true
}
```

**Contratos**

```json
{
  "url": "https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1/sync-contracts-at?mode=sync",
  "events": ["contract.created", "contract.updated", "contract.status_changed", "contract.deleted"],
  "description": "ERP EnerSave — contratos",
  "active": true
}
```

**Liquidaciones**

```json
{
  "url": "https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1/sync-liquidations-at?mode=sync",
  "events": ["liquidation.updated", "liquidation.payment_status_changed"],
  "description": "ERP EnerSave — liquidaciones",
  "active": true
}
```

**Incidencias** (incluye `contract_incident.*`; no mezclar con el webhook de contratos)

```json
{
  "url": "https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1/sync-incidents-at?mode=sync",
  "events": ["incident.created", "incident.updated", "incident.status_changed", "contract_incident.created", "contract_incident.status_changed"],
  "description": "ERP EnerSave — incidencias",
  "active": true
}
```

**Emails**

```json
{
  "url": "https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1/sync-emails-at?mode=sync",
  "events": ["email.logged", "email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained", "email.delivery_failed"],
  "description": "ERP EnerSave — avisos email",
  "active": true
}
```

Tarifas y marcos (si hay que recrearlos): `product.created|updated|deleted` → `sync-tariffs-at`; `marco.created|updated|deleted` → `sync-marcos-at`.

Alternativa: un solo webhook a `…/ate-webhooks` con todos los eventos; el dispatcher enruta por prefijo.

Dispatcher: `ate-webhooks`. Ejemplo: `POST …/functions/v1/sync-clients-at?mode=sync`
