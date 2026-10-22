# Invoice AI — API del extractor de facturas

## Endpoint principal (Gemini 2.0 Flash)

```
POST /functions/v1/invoice-ai-enersave
Authorization: Bearer <supabase_access_token>
Content-Type: multipart/form-data
```

**Archivos aceptados**
- `file` / `file_0`, `file_1`, `file_2` — hasta 3 archivos
- PDF: máx. 20 MB (1 por llamada, sin imágenes adicionales)
- Imágenes (JPG, PNG, WebP): máx. 10 MB cada una

**Priority chain en el frontend**
1. Gemini 2.0 Flash (`invoice-ai-enersave`) — primario
2. OpenAI GPT-4o (`invoice-ai-openai`) — fallback
3. DirectServi — fallback externo
4. OCR local — último recurso

---

## Campos extraídos (`InvoiceAiPublicPayload`)

### Identificación del suministro

| Campo | Tipo | Descripción |
|---|---|---|
| `cups` | `string \| null` | Código CUPS (empieza por ES) |
| `companyBrand` | `string \| null` | Nombre de la comercializadora |
| `holderNif` | `string \| null` | NIF / CIF / NIE del titular |
| `holderName` | `string \| null` | Nombre del titular |
| `invoiceDate` | `string \| null` | Fecha de factura (AAAA-MM-DD) |
| `invoiceDays` | `number \| null` | Días del período facturado |
| `supplyType` | `"luz" \| "gas" \| null` | Tipo de suministro |
| `segment` | `"residencial" \| "pyme" \| null` | Segmento deducido del NIF |

### Tarifa y categoría

| Campo | Tipo | Descripción |
|---|---|---|
| `electricityCategory` | `string \| null` | Tarifa de acceso: 2.0TD, 3.0TD, 6.1TD…6.4TD |
| `gasCategory` | `string \| null` | Categoría gas: RL1–RL5 |
| `electricityTaxRegime` | `string \| null` | Régimen fiscal eléctrico |

### Electricidad — potencia y energía

| Campo | Tipo | Descripción |
|---|---|---|
| `powerKwByPeriod` | `number[6]` | Potencia contratada kW P1–P6 (0 si no aplica) |
| `powerCostEur` | `number \| null` | Importe total término de potencia |
| `energyKwhByPeriod` | `number[6]` | kWh consumidos en el periodo, columna «Consumos». No la lectura del contador ni «Lecturas reales» (0 si no aplica) |
| `energyCostEur` | `number \| null` | Importe total término de energía |

> **2.0TD**: potencia activa en P1 y P2; energía en P1, P2, P3. P4–P6 = 0.  
> **3.0TD / 6.xTD**: potencia y energía en P1–P6.

### Costes adicionales electricidad

| Campo | Tipo | Descripción |
|---|---|---|
| `meterRentalAmount` | `number \| null` | Alquiler del equipo de medida (período) |
| `socialBonusCostEur` | `number \| null` | Bono social |
| `financingSocialBonusAmount` | `number \| null` | Financiación del bono social |
| `otherCosts` | `number \| null` | Otros costes / SVA no incluidos arriba |
| `totalAmountEur` | `number \| null` | Total con impuestos (puede ser negativo en rectificativas) |

### Gas

| Campo | Tipo | Descripción |
|---|---|---|
| `gasConsumoKwh` | `number \| null` | Consumo del período en kWh |
| `gasPrecioVariableEurKwh` | `number \| null` | Precio variable EUR/kWh |
| `gasTerminoFijoEurDia` | `number \| null` | Cuota fija EUR/día |
| `gasTerminoFijoEurTotal` | `number \| null` | Importe total término fijo |
| `gasIhcCantidadKwh` | `number \| null` | Impuesto de hidrocarburos — cantidad kWh |
| `gasIhcPrecioEurKwh` | `number \| null` | Impuesto de hidrocarburos — precio EUR/kWh |
| `gasIhcTotalEur` | `number \| null` | Impuesto de hidrocarburos — importe total |
| `gasTasasEspecialesEur` | `number \| null` | Tasas especiales |
| `gasCanonIrcEur` | `number \| null` | Canon IRC |
| `gasOtrosServiciosEur` | `number \| null` | Otros servicios / SVA |
| `gasOtrosConceptosEur` | `number \| null` | Otros conceptos |
| `gasImpuestoIndirectoPct` | `number \| null` | Porcentaje de impuesto indirecto |

---

## Lógica de segmentación (automática)

- **DNI** (8 dígitos + letra) → `residencial`
- **NIE** (X/Y/Z + 7 dígitos + letra) → `residencial`
- **CIF** (letra + 7 dígitos + control) → `pyme`
- Si aparece CNAE empresarial aunque el titular tenga DNI → `pyme`
- Ambiguo → `null`

## Categorías de gas (RL)

| Categoría | Consumo anual |
|---|---|
| RL1 | ≤ 5.000 kWh |
| RL2 | 5.001 – 15.000 kWh |
| RL3 | 15.001 – 50.000 kWh |
| RL4 | 50.001 – 300.000 kWh |
| RL5 | > 300.000 kWh |

Si no hay dato de consumo anual en la factura → `null`.

---

## Mapeo al panel del comparador

Los campos se convierten a `ComparadorInvoiceExtraction` mediante  
`mapInvoiceAiToComparadorExtraction()` en `src/lib/comparador/invoice-ai-to-comparador.ts`.

Los periodos activos (`energyKwhByPeriod`, `powerKwByPeriod`) con valor > 0 se  
mapean a los slots `ComparadorPeriodSlot`: `"p1" | "p2" | "p3" | "p4" | "p5" | "p6"`.
