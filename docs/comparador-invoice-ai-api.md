# API Edge: análisis de facturas con IA (`ai-assistant`) — EnerSave

Documentación para integrar la pantalla **Comparador** (adjuntar PDF o 1–3 imágenes) con la función Edge **Invoice AI**. Incluye autenticación con **clave Invoice AI**, `multipart/form-data`, respuestas **SSE** o **JSON**, y el **mapeo de campos** al formulario del comparador.

> **Proyecto EnerSave**  
> URL base: `SUPABASE_URL` o `VITE_INVOICE_AI_ASSISTANT_URL` (solo dominio del proyecto) → se añade `/functions/v1/ai-assistant` automáticamente si falta.  
> Clave: `VITE_INVOICE_AI_KEY` (`pk-…` en navegador o `sk-…` solo en servidor).

---

## Mapeo respuesta IA → campos del comparador (EnerSave)

| Clave API (§ payload público) | Campo / estado en comparador |
|------------------------------|------------------------------|
| `cups` | CUPS del suministro |
| `companyBrand` | Comercializadora actual |
| `electricityCategory` / `tariffType` | Tarifa de acceso (chips 2.0TD, 3.0TD…) |
| `segment` | Segmento residencial / PYME |
| `supplyType` / `billCategory` | Tipo luz / gas |
| `powerKwByPeriod[0..5]` | Potencia P1…P6 (kW) |
| `energyKwhByPeriod[0..5]` | Consumo facturado P1…P6 (kWh) |
| `invoiceDays` | Días facturados |
| `powerCostEur` + `energyCostEur` + días | Precios €/kW·día y €/kWh (derivados) |
| `meterRentalAmount` | Alquiler contador (mensualizado) |
| `socialBonusCostEur` | Bono social (cargo → suma en base IE) |
| `financingSocialBonusAmount` | Descuento bono social (resta) |
| `otherCosts` + `extraServices` | Otros conceptos / SVA |
| `totalAmountEur` | Factura mensual (prorrateo si periodo ≠ 30 días) |
| `electricityTaxRegime` | Régimen IE/IVA en simulador |
| `consumptionFromProfile` | Aviso si consumos estimados por perfil |

Parámetros recomendados en comparador: `skipDraftContract=true`, `skipTrainingDatasetInsert=true` (no persistir facturas de prueba).

### Directrices de lectura (OCR local e IA)

| Concepto en factura | Campo comparador | Reglas |
|---------------------|------------------|--------|
| **Alquiler de contador** = **Alquiler de equipos** / **Equipos de medida** (Repsol, «Otros conceptos») | Alquiler contador (`meterRentalAmount` → mensual) | Misma línea; importe del periodo (ej. 0,88 € TotalEnergies, 0,83 € Repsol). Si el periodo es ~30 días, no prorratear. |
| **Días facturados** | `invoiceDays` | Prioridad: etiqueta `Días facturados` (Repsol) o rango `Periodo de facturación`. No usar el primer `N días` del desglose de potencia. |
| **Servicios** (Repsol resumen) | Otros costes / SVA | Línea `Servicios X,XX €` del resumen (pág. 1) o desglose (pág. 2), ej. 4,20 €. |
| **Financiación** bono (Repsol) | Bono social | Suma de líneas `Financiación` bajo «Otros conceptos» (ej. 0,14 + 0,38 €). |
| **Financiación de Bono Social** (Naturgy) | Bono social | Importe tras `=` en la línea (ej. 0,67 €), no confundir con €/día. |
| **Consumo electricidad Punta/Llano/Valle** (Naturgy) | P1–P3 kWh | kWh enteros (ej. 40 / 49 / 105); escalar a mes con días del periodo. |
| **Alquiler de contador** con cálculo | Alquiler contador | Importe final tras `=` (ej. 35 días × … = 0,93 €). |
| **Total a pagar** (Naturgy) | Factura mensual | Etiqueta `Total a pagar` con IVA (ej. 51,78 €). |
| **Consumo del periodo** Punta/Llano/Valle | P1–P3 kWh/mes | Tabla Repsol; escalar a 30 días con `Días facturados`. |
| **Importe total a pagar** | Factura mensual / `totalAmountEur` | En TotalEnergies, **prioridad 1ª página**: `¿Cuánto tengo/tienes que pagar?` o `por valor de … euros` (ej. **152,38 €** = luz + servicios + impuestos). **No** usar solo `IMPORTE TOTAL ELECTRICIDAD + TASAS E IMPUESTOS` (ej. 143,89 € = solo electricidad). |
| Bloque **SERVICIOS** (2ª página) | Otros costes / SVA (`otherCosts`, `extraServices`) | Etiqueta `IMPORTE TOTAL SERVICIOS + TASAS E IMPUESTOS` o sección `SERVICIOS Período facturación` (ej. **8,49 €**). Ignorar “Tasas e impuestos” de la 1ª página junto a “Contratar Servicios” (no es el SVA facturado). |

Implementación OCR: `src/lib/invoice-ocr-billing-lines.ts`.

Tras la respuesta de la IA, el comparador **vuelve a leer el PDF/imagen** (OCR local) y **prioriza** esos tres importes sobre `totalAmountEur` / `otherCosts` de la API cuando hay conflicto (p. ej. total 152,38 € en SVA). Ver `comparador-invoice-billing-merge.ts`.

---

## 1. Endpoints

| Entorno | Método | URL |
|--------|--------|-----|
| Producción | `POST` | `{VITE_SUPABASE_URL}/functions/v1/ai-assistant` |
| Desarrollo (si está desplegada) | `POST` | `{VITE_SUPABASE_URL}/functions/v1/ai-assistant-development` |

- **CORS**: `OPTIONS` soportado.
- **`verify_jwt = false`**: no usar anon key del proyecto; usar **Invoice AI Key**.

---

## 2. Autenticación

### Clave Invoice AI (obligatoria)

1. **Multipart**: campo **`invoiceAiKey`**
2. **Cabecera**: **`X-Invoice-AI-Key`**

### `pk-` vs `sk-`

- **`pk-`**: navegador; `Origin` debe estar en `allowed_origins` de la clave.
- **`sk-`**: solo backend.

---

## 3. Cuerpo `multipart/form-data`

### Archivos

| Campo | Descripción |
|-------|-------------|
| `file` | Primer archivo (compatibilidad) |
| `file_0`, `file_1`, `file_2` | Hasta **3 imágenes** misma factura |
| `fileName` / `fileNames` | Trazabilidad |
| `fileType` | MIME |

**Reglas:** un solo PDF **o** 1–3 imágenes (no mezclar).

### Parámetros útiles en EnerSave

| Campo | Uso |
|-------|-----|
| `extractionType` | `technical` (por defecto) |
| `disableStreaming` | `true` → JSON único (más simple en UI) |
| `skipDraftContract` | `true` en comparador |
| `skipTrainingDatasetInsert` | `true` en pruebas |
| `companyCandidates` | Lista comercializadoras del catálogo |

---

## 4. Payload público (resumen)

Ver implementación en `src/lib/comparador/invoice-ai-types.ts` y mapeo en `invoice-ai-to-comparador.ts`.

Campos clave: `billCategory`, `electricityCategory`, `powerKwByPeriod`, `energyKwhByPeriod`, `invoiceDays`, `powerCostEur`, `energyCostEur`, `meterRentalAmount`, `socialBonusCostEur`, `financingSocialBonusAmount`, `otherCosts`, `extraServices`, `totalAmountEur`, `electricityTaxRegime`, `cups`, `companyBrand`, `holderName`, `holderNif`.

**Bono social:** `socialBonusCostEur` suma a la base del IE; `financingSocialBonusAmount` resta (descuento).

---

## 5. Cliente en el repo

- `src/lib/comparador/invoice-ai-client.ts` — llamada HTTP
- `src/lib/comparador/invoice-ai-to-comparador.ts` — traducción a `ComparadorInvoiceExtraction`
- `src/lib/comparador-ocr-apply.ts` — aplica al estado React del comparador

Si `VITE_INVOICE_AI_KEY` no está definida, el comparador usa **OCR local** (`contract-ocr.ts`) con heurísticas de periodos Punta/Llano/Valle.

---

*Documento adaptado para **EnerSave ERP**. Origen técnico: integración Invoice AI Edge.*
