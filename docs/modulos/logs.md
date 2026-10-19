# Logs Enertech (`/erp/logs`)

Pantalla de auditoría de la API de Enertech. La ven tramitación y el superadmin dueño (`canAccessEnertechLogs`). El resto del personal no tiene la entrada en el menú. `/erp/enertech-webhooks` abre esta misma pantalla.

Hay tres pestañas.

## Entrantes

Lista `enertech_webhook_events`, de más reciente a más antiguo, de 25 en 25.

- **Firma inválida:** Enertech (o quien llamó) no firmó con el secreto. La fila se guardó y la función respondió 401. El estado del contrato no se tocó.
- **Aplicado:** la firma era válida y el estado se escribió en `contratos_equipo`. La nota dice `estado aplicado a <id>`.
- **No aplicado:** la firma era válida y el estado no se escribió.
  - `estado "<etiqueta>" no mapea al dominio del ERP`: Enertech mandó un estado que el ERP no conoce.
  - `contrato Enertech <id> no encontrado`: había id de contrato y ninguna fila local tiene ese `metadata.enertech_contract_id`.
  - `CUPS <cups> sin contrato local`: no había id utilizable y el CUPS no coincide con un contrato.
  - `contrato no encontrado`: el aviso no trae estado, id ni CUPS con los que localizar una fila.

El chip **Solo problemas** deja las filas con firma inválida o con `processed = false`.

## Salientes

Lista `enertech_outbound_events`. Cada `POST /clientes` o `POST /contratos` que sale de `enertech-alta` deja una fila antes de llamar a Enertech. El cuerpo guardado no incluye `documentos` ni `base64`; el número de archivos y la suma de sus base64 van en columnas aparte.

- Enertech rechaza el cliente (DNI/CIF que ellos no aceptan, documento ya existente) o el contrato (CUPS, tarifa): HTTP 4xx, con `error_code` y `error_message`.
- Documentos por encima de 20 MB en total: `documents_rejected`, sin HTTP, mensaje «Documentos superan el límite permitido (20 MB)». No se llama a Enertech.
- Un DNI inválido, un NIE sin nacionalidad o un CIF sin apoderado lo para el formulario (`buildEnertechClienteBody`) antes de la función. No hay fila. El asistente enseña ese texto en el aviso de error.
- `POST /clientes` queda `not_applicable`: no se reconcilia con `contratos_equipo`.
- Un `POST /contratos` que Enertech acepta y el ERP guarda queda `ok`. Si Enertech acepta y `updateTeamContract` falla, queda `orphan`.

Al abrir la fila se ve el JSON enviado y el JSON devuelto, ya sin documentos.

## Reconciliación

Solo filas `orphan`: Enertech tiene el contrato y el ERP no guardó el id. Para cada una se pide el `idContract`, se escribe en `metadata.enertech_contract_id` del contrato del ERP y la fila pasa a `ok` con la nota `reconciliado manualmente por <email>`.

La tabla ya está en remoto. El RPC `mark_enertech_outbound_reconciliation_v1` de `20261019140000_enertech_outbound_events.sql` no está aplicado: hasta entonces «Marcar reconciliado» no cierra la fila. El registro dentro de `enertech-alta` y la nota del webhook no están desplegados.
