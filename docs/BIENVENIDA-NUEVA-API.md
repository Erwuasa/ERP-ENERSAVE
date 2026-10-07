# Bienvenido a la API de aenergetic ⚡

Guía de arranque para quien acaba de recibir su acceso. En cinco minutos tienes
hecha tu primera llamada.

> Esta es la guía **genérica**. Si tu integración tiene condiciones particulares
> (webhooks, alta de contratos, cupos distintos), te las habremos dicho aparte.

---

## Qué es esto

Una API REST para consultar nuestro CRM desde tu propio software: **el estado de
tus contratos**, el catálogo de comercializadoras, **tus precios y tus
comisiones**, los **datos SIPS** de un suministro y **qué documentación** hace
falta para contratar en cada caso.

Tres cosas que conviene tener claras desde el principio:

- **Cada credencial ve solo lo suyo.** Tus contratos, tus clientes, tus
  comisiones. No hay forma de ver los de otro.
- **Las comisiones llegan ya calculadas para tu perfil.** No tienes que aplicar
  ningún porcentaje por tu cuenta.
- **Todo es JSON**, con códigos de error estables y documentación interactiva
  donde puedes probar cada llamada desde el navegador.

## Tu acceso

| | |
|---|---|
| **URL base** | `https://intranet.enertechcore.com/v1/` |
| **Documentación interactiva** | <https://intranet.enertechcore.com/v1/docs> |
| **Especificación OpenAPI** | <https://intranet.enertechcore.com/v1/openapi.json> |
| **Tu API key** | Te la entregamos por canal seguro. **Guárdala: no se vuelve a mostrar.** |

La documentación y la especificación son públicas —solo describen la forma de la
API—, pero **cualquier llamada real exige tu credencial**. La especificación se
puede importar tal cual en Postman o Insomnia.

## Primera llamada (30 segundos)

```bash
curl -H "X-Api-Key: TU_API_KEY" https://intranet.enertechcore.com/v1/perfil
```

Si ves tu nombre en la respuesta, ya estás dentro. `GET /perfil` te dice además
**a qué recursos tienes acceso**, así que es el mejor sitio para empezar.

## Autenticación: dos formas, las dos valen

- **La sencilla**: manda la cabecera `X-Api-Key: TU_API_KEY` en cada llamada.
- **Con token de sesión**: canjea tu API key por un JWT de 1 hora en
  `POST /v1/auth/token` y úsalo como `Authorization: Bearer <token>`.

Funcionan igual en todos los recursos. Elige la que te encaje.

## Qué puedes consultar

```bash
# ---- TUS CONTRATOS ----
# Estado de un contrato concreto, por CUPS
curl -H "X-Api-Key: TU_API_KEY" \
  "https://intranet.enertechcore.com/v1/estados?cups=ES0000000000000000XX"

# Listado paginado. `modificado_desde` es la forma eficiente de reconciliar:
# te trae solo lo que ha cambiado desde la última vez que preguntaste.
curl -H "X-Api-Key: TU_API_KEY" \
  "https://intranet.enertechcore.com/v1/contratos?modificado_desde=2026-09-01&limit=100"

# Detalle de uno (incluye tramos de potencia y fees)
curl -H "X-Api-Key: TU_API_KEY" \
  "https://intranet.enertechcore.com/v1/contratos/12345"

# ---- CATALOGO ----
# Comercializadoras disponibles (id + nombre). Empieza por aquí: el `id` es el
# que usan los demás recursos.
curl -H "X-Api-Key: TU_API_KEY" \
  "https://intranet.enertechcore.com/v1/comercializadoras"

# Precios de una comercializadora. Cada tarifa trae una clave estable (tf_...)
# que puedes guardar: no cambia aunque se actualicen los precios.
curl -H "X-Api-Key: TU_API_KEY" \
  "https://intranet.enertechcore.com/v1/precios?company=14&tipo=fijo"

# Tus comisiones, ya calculadas a tu nivel
curl -H "X-Api-Key: TU_API_KEY" \
  "https://intranet.enertechcore.com/v1/comisiones?company=14&tipo=fijo"

# Diccionario de tarifas de acceso (ATR): 2.0TD, 3.0TD, 6.1TD...
curl -H "X-Api-Key: TU_API_KEY" \
  "https://intranet.enertechcore.com/v1/tarifas-acceso"

# ---- DATOS DE UN SUMINISTRO ----
# SIPS: tarifa, potencias por periodo, consumo anual, CNAE, distribuidora.
curl -H "X-Api-Key: TU_API_KEY" \
  "https://intranet.enertechcore.com/v1/sips?cups=ES0000000000000000XX"

# ---- DOCUMENTACION EXIGIDA ----
# Qué documentos hacen falta para contratar en un caso concreto. Es la MISMA
# lista que ve nuestro propio comercial, así que lo que diga aquí es lo que se
# le va a exigir al contrato.
curl -H "X-Api-Key: TU_API_KEY" \
  "https://intranet.enertechcore.com/v1/documentacion?comercializadora=ENDESA&segmento=pyme&cambio_titular=1"

# Sin parámetros devuelve la matriz completa, para que la caches de tu lado.
curl -H "X-Api-Key: TU_API_KEY" \
  "https://intranet.enertechcore.com/v1/documentacion"
```

Para `producto`: manda `gas` cuando sea gas; si no lo mandas, se entiende luz.

En `/documentacion`, el `segmento` es `residencial`, `autonomo`, `pyme` o `ccpp`
(comunidad de propietarios). Si no lo sabes, manda `dni_cif` y lo deducimos —
**con una excepción: `autonomo` no se puede deducir de un documento**. Si tu
cliente lo es, mándalo explícitamente o lo trataremos como residencial o pyme.

## Dar de alta un cliente y un contrato

El alta por API está **abierta**. Son dos pasos: primero el cliente, luego su
contrato.

```bash
# 1) El cliente. Obligatorios: `nombre`, `dni` y -- si el documento es un DNI o
#    un NIE -- `apellido1`. Mas dos condiciones:
#    - documento NIE  -> `nacionalidad` es OBLIGATORIA
#    - documento CIF  -> hacen falta `apoderadoNombre` y `apoderadoDni`
curl -X POST -H "X-Api-Key: TU_API_KEY" -H "Content-Type: application/json"   https://intranet.enertechcore.com/v1/clientes   -d '{"nombre":"Ana","apellido1":"Garcia","dni":"12345678Z","email":"ana@ejemplo.es","movil1":"600000000"}'
# -> 201 con el id del cliente. Si ya existe ese documento: 409 CLIENT_EXISTS.
#    Si falta la nacionalidad de un NIE o el apoderado de un CIF, el error es
#    400 MISSING_DATOS_CONTRATACION (no un codigo por campo).

# 2) El contrato. `clientId` y `cups` son obligatorios, pero manda todo lo que
#    tengas: cuanto más completo, menos posibilidades de que caiga en incidencia.
curl -X POST -H "X-Api-Key: TU_API_KEY" -H "Content-Type: application/json"   https://intranet.enertechcore.com/v1/contratos   -d '{
        "clientId": 12345,
        "cups": "ES0000000000000000XX",
        "id_tarifa": 9876,
        "id_rate": 3,
        "cnae": "4711",
        "via_tipo": "CALLE", "via_nombre": "Mayor", "via_numero": "10",
        "cp": "41001", "poblacion": "Sevilla", "provincia": "Sevilla",
        "iban": "ES0000000000000000000000",
        "consumption": 4200,
        "power_p1": 4.6, "power_p2": 4.6,
        "documentos": [{"nombre":"dni.pdf","contenido":"<base64>"}]
      }'
```

**El camino fácil es `id_tarifa`**: coge el campo `id` de una fila de
`GET /precios` y mándalo. Con eso resolvemos solos la comercializadora y la
oferta, y no tienes que pelearte con ids internos. (Si prefieres guardar algo
estable, `clave_tarifa` con la clave `tf_...` hace lo mismo.)

**Cosas que conviene saber antes del primer alta:**

- **`cnae` es obligatorio** salvo en eficiencia: de él depende el segmento del
  cliente y, por tanto, la documentación que se le va a exigir.
- **Mira `GET /documentacion` ANTES de mandar el contrato**, con la
  comercializadora y el segmento del caso. Te dice exactamente qué documentos
  hacen falta, y los mandas ya en `documentos` (base64).
- **El contrato puede nacer en INCIDENCIA.** Si no mandas documentos y la matriz
  los exige, o si no son aptos, el contrato se crea igual pero entra en
  incidencia — exactamente igual que si lo cargara un comercial nuestro a mano.
  No es un error de tu integración: es el mismo circuito.
- **El contrato nace en su estado natural**: «Pte. RGPD» si el cliente todavía
  no ha firmado, o «Pendiente de carga» si ya lo hizo.
- Si el alta estuviera cerrada en tu entorno, la respuesta sería un `503` con
  `code: ALTA_DESHABILITADA`. Hoy está abierta.

## Avisos en tiempo real (webhooks)

No hace falta que preguntes en bucle. Cuando uno de tus contratos **cambia de
estado**, te enviamos un **POST HTTPS firmado (HMAC-SHA256)** a la URL que nos
indiques, con reintentos automáticos si tu servidor no responde.

- Pásanos tu **URL de endpoint** y te devolvemos el **secret** de firma (una sola
  vez, igual que la API key).
- Puedes consultar tus suscripciones en `GET /v1/webhooks`.
- Te pasamos aparte el detalle del payload y cómo verificar la firma.

## Antes de ponerte a programar

**1. Programa contra el `code`, no contra el texto.** Todos los errores llegan en
JSON con un campo `code` estable (`INVALID_CUPS`, `COMPANY_NOT_FOUND`,
`MISSING_SEGMENT`…). Los textos pueden cambiar; los códigos no.

**2. SIPS tiene tres respuestas posibles, y conviene manejar las tres:**

| | |
|---|---|
| `200` con `estado: listo` | Datos disponibles. **Usa el campo `resumen`** (ver abajo). |
| `202` con `estado: procesando` | No lo teníamos a mano: lo estamos buscando. Repite **la misma llamada** pasados los segundos de `reintentar_en` (unos 30). |
| `200` con `estado: sin_datos` | Respuesta **definitiva**: ningún proveedor tiene histórico de ese CUPS. No insistas; se vuelve a intentar de verdad pasadas 24 h. |

La mayoría de las veces recibirás el `200` **en la primera llamada**, en 2-4
segundos. El `202` es el camino de respaldo.

**3. En SIPS, usa `resumen` y no `datos`.** `resumen` tiene siempre la misma
forma venga del proveedor que venga. `datos` es la respuesta **cruda** del
proveedor y su estructura **cambia según el campo `origen`**: si te enganchas ahí,
tu integración se romperá el día que ese CUPS lo resuelva el otro proveedor.

**4. Límites.** Hay un límite de peticiones por credencial y una cuota aparte
para consultas SIPS nuevas. Si recibes un `429`, respeta la cabecera
`Retry-After`.

**5. Paginación.** Los listados (`/contratos`, `/clientes`) van paginados con
`page` y `limit`. No asumas que la primera página es todo.

**6. El alta no es solo consulta.** Puedes crear clientes y contratos por
`POST` (ver arriba). Un contrato creado por API entra **en el mismo circuito**
que uno cargado por nuestros comerciales: misma validación de documentación,
mismos estados, misma tramitación automática.

**7. Esto es producción.** Los datos son reales desde la primera llamada.

## Entorno de pruebas

`https://devintranet.enertechcore.com/v1/` — copia de producción con los correos
apagados, para que experimentes sin consecuencias. Mismos recursos y mismo
formato.

**Usa una clave distinta**: la de producción no vale en pruebas ni al revés.
Pídenosla si la quieres.

## Soporte

Cualquier duda durante la integración, escribe a tu contacto en aenergetic.

**¡Bienvenido a bordo!**
El equipo de aenergetic
