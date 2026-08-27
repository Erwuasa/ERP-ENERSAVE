# Edges AT Enterprise (ERP)

Fuente canónica en **ERP-ENERSAVE**. Se despliegan en el proyecto Supabase principal (`unxrvwuaqhwogwvynoyq`).

| Función | Uso |
|---|---|
| `sync-tariffs-at` | `mode=explore` o `mode=sync` → `providers`, `tariffs`, `tariff_prices` |
| `sync-marcos-at` | `mode=explore` o `mode=sync` → `marco_retributivo` |
| `ate-webhooks` | Receptor único: `product.*` → tarifas, `marco.*` → marcos |

`verify_jwt = false`. Auth: HMAC `x-ate-*`, Bearer `AT_TARIFFS_SYNC_SECRET` o `x-webhook-secret`.

Secrets: `AT_ENTERPRISE_API_KEY`, `AT_TARIFFS_SYNC_SECRET`.

## Deploy

```bash
npx supabase functions deploy sync-tariffs-at --project-ref unxrvwuaqhwogwvynoyq
npx supabase functions deploy sync-marcos-at --project-ref unxrvwuaqhwogwvynoyq
npx supabase functions deploy ate-webhooks --project-ref unxrvwuaqhwogwvynoyq
```

Webhook AT recomendado: `…/functions/v1/ate-webhooks` con `product.*` y `marco.*` (o `*`).

Las tarifas AT quedan con `web_visible=false` hasta publicarlas en el ERP. El catálogo manual (sin `at_rate_id`) no se toca.
