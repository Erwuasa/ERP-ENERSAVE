// Invoice extraction for the comparador, backed by Gemini 2.0 Flash.
// Primary provider. OpenAI and the third-party assistant stay as fallbacks in the client.
// Auth: default verify_jwt (do not set verify_jwt = false). GEMINI_API_KEY stays a function secret.
import { corsHeadersFor, handleOptions } from "../_shared/cors.ts"

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

const MAX_PDF_BYTES = 20 * 1024 * 1024
const MAX_IMG_BYTES = 10 * 1024 * 1024
const MAX_FILES = 3

const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    cups: { type: "string", nullable: true, description: "Código CUPS del punto de suministro (empieza ES)" },
    companyBrand: { type: "string", nullable: true, description: "Nombre comercializadora" },
    holderNif: { type: "string", nullable: true, description: "NIF/CIF/NIE del titular" },
    holderName: { type: "string", nullable: true },
    invoiceDate: { type: "string", nullable: true, description: "Fecha de factura AAAA-MM-DD" },
    invoiceDays: { type: "number", nullable: true, description: "Días del período de facturación" },
    supplyType: { type: "string", nullable: true, enum: ["luz", "gas", null], description: "Tipo de suministro" },
    segment: { type: "string", nullable: true, enum: ["residencial", "pyme", null], description: "Segmento deducido del NIF" },
    electricityCategory: { type: "string", nullable: true, description: "Tarifa de acceso eléctrica: 2.0TD, 3.0TD, 6.1TD, 6.2TD, 6.3TD, 6.4TD" },
    gasCategory: { type: "string", nullable: true, description: "Categoría gas: RL1, RL2, RL3, RL4, RL5" },
    electricityTaxRegime: { type: "string", nullable: true, description: "Régimen fiscal eléctrico si aparece" },
    powerKwByPeriod: {
      type: "array",
      items: { type: "number" },
      minItems: 6,
      maxItems: 6,
      description: "Potencia contratada kW P1..P6, 0 si no aplica",
    },
    powerPriceEurKwDayByPeriod: {
      type: "array",
      items: { type: "number" },
      minItems: 6,
      maxItems: 6,
      description: "Precio unitario de potencia EUR/kW día, P1..P6. 0 si no aplica. No es el importe total.",
    },
    powerCostEur: { type: "number", nullable: true, description: "Coste total término de potencia en EUR" },
    energyKwhByPeriod: {
      type: "array",
      items: { type: "number" },
      minItems: 6,
      maxItems: 6,
      description: "Energía kWh P1..P6. Buscar también Lectura por periodos. Si es kWh/día, multiplicar por invoiceDays.",
    },
    energyPriceEurKwhByPeriod: {
      type: "array",
      items: { type: "number" },
      minItems: 6,
      maxItems: 6,
      description: "Precio unitario de energía EUR/kWh, P1..P6. 0 si no aplica. Si hay un solo precio, repetirlo en los periodos activos.",
    },
    energyCostEur: { type: "number", nullable: true, description: "Coste total término de energía en EUR" },
    meterRentalAmount: { type: "number", nullable: true, description: "Alquiler del equipo de medida del período" },
    socialBonusCostEur: { type: "number", nullable: true, description: "Importe en EUR de Financiación de Bono Social, también en pyme si pasa de unos pocos euros" },
    financingSocialBonusAmount: { type: "number", nullable: true, description: "Financiación bono social" },
    otherCosts: { type: "number", nullable: true, description: "Otros costes/SVA que no sean potencia, energía, contador ni impuestos" },
    totalAmountEur: { type: "number", nullable: true, description: "Importe total con impuestos" },
    gasConsumoKwh: { type: "number", nullable: true, description: "Gas: consumo del período en kWh" },
    gasPrecioVariableEurKwh: { type: "number", nullable: true, description: "Gas: precio variable EUR/kWh" },
    gasTerminoFijoEurDia: { type: "number", nullable: true, description: "Gas: término fijo EUR/día" },
    gasTerminoFijoEurTotal: { type: "number", nullable: true, description: "Gas: importe total del término fijo" },
    gasIhcCantidadKwh: { type: "number", nullable: true, description: "Gas: cantidad IHC en kWh" },
    gasIhcPrecioEurKwh: { type: "number", nullable: true, description: "Gas: precio IHC EUR/kWh" },
    gasIhcTotalEur: { type: "number", nullable: true, description: "Gas: importe total IHC" },
    gasTasasEspecialesEur: { type: "number", nullable: true, description: "Gas: tasas especiales en EUR" },
    gasCanonIrcEur: { type: "number", nullable: true, description: "Gas: canon IRC en EUR" },
    gasOtrosServiciosEur: { type: "number", nullable: true, description: "Gas: otros servicios/SVA" },
    gasOtrosConceptosEur: { type: "number", nullable: true, description: "Gas: otros conceptos" },
    gasImpuestoIndirectoPct: { type: "number", nullable: true, description: "Gas: porcentaje de impuesto indirecto" },
  },
  required: [
    "cups", "companyBrand", "holderNif", "holderName", "invoiceDate", "invoiceDays",
    "supplyType", "segment", "electricityCategory", "gasCategory", "electricityTaxRegime",
    "powerKwByPeriod", "powerPriceEurKwDayByPeriod", "powerCostEur",
    "energyKwhByPeriod", "energyPriceEurKwhByPeriod", "energyCostEur",
    "meterRentalAmount", "socialBonusCostEur", "financingSocialBonusAmount",
    "otherCosts", "totalAmountEur",
    "gasConsumoKwh", "gasPrecioVariableEurKwh", "gasTerminoFijoEurDia",
    "gasTerminoFijoEurTotal", "gasIhcCantidadKwh", "gasIhcPrecioEurKwh",
    "gasIhcTotalEur", "gasTasasEspecialesEur", "gasCanonIrcEur",
    "gasOtrosServiciosEur", "gasOtrosConceptosEur", "gasImpuestoIndirectoPct",
  ],
}

const SYSTEM_PROMPT = `Eres un extractor especializado en facturas de electricidad y gas españolas para una asesoría energética.

Lee la factura adjunta (imagen o PDF) y extrae los datos según el esquema JSON.

REGLAS GENERALES:
- Si un dato no aparece en la factura: devuelve null (o array de ceros para powerKwByPeriod/energyKwhByPeriod).
- Importes SIEMPRE en euros con punto decimal (nunca coma). Ej: 45.32
- No inventes datos que no estén explícitamente en la factura.
- powerKwByPeriod, energyKwhByPeriod, powerPriceEurKwDayByPeriod y energyPriceEurKwhByPeriod tienen SIEMPRE 6 posiciones (P1..P6 en orden).

TIPO DE SUMINISTRO (supplyType) — el campo más importante:
- "luz" si la factura dice electricidad, peaje 2.0TD/3.0TD/6.xTD, término de potencia o impuesto electricidad.
- "gas" solo si es una factura de gas de verdad: peaje RL1–RL5, término fijo de gas o suministro de gas.
- Una dirección («Plaça del Gas», «Plaza del Gas»), el mix de generación o la línea «CC Gas Natural» NO convierten una factura eléctrica en gas.
- Si aparecen señales de luz y de gas, gana la luz.

SEGMENTO (segment) - deducir del NIF:
- DNI: 8 dígitos + letra → "residencial"
- NIE: letra X/Y/Z + 7 dígitos + letra → "residencial"
- CIF: letra + 7 dígitos + control → "pyme"
- Un CNAE en una factura con DNI o NIE y peaje 2.0TD sigue siendo "residencial"
- Duda → null

TARIFA DE ACCESO ELÉCTRICA (electricityCategory):
- Copiar el peaje de «Peaje de transporte y distribución»: 2.0TD, 3.0TD, 6.1TD, 6.2TD, 6.3TD, 6.4TD.
- En gas, gasCategory es RL1–RL5 y electricityCategory queda null.

PERIODOS ACTIVOS:
- 2.0TD: potencia en P1 y P2; energía en P1, P2 y P3. El resto a 0.
- 3.0TD y 6.x: potencia y energía en P1..P6.

CONSUMO ELÉCTRICO (energyKwhByPeriod):
- Copia los kWh de la columna o el bloque «Consumos» (también «Consumo por periodos» o el kWh del desglose que multiplica el €/kWh).
- «Lecturas reales», «Lectura» y el acumulado del contador no son el consumo. Si salen las dos cosas, ignora las lecturas.
- Ejemplo: Lecturas reales P1 19.353 kWh y Consumos P1 60,22 kWh → P1 es 60.22. Igual con P2 y P3.
- Si los kWh se muestran como kWh/día, multiplicar por invoiceDays. Si ya son los kWh del periodo, copiarlos tal cual.

POTENCIA (powerKwByPeriod):
- Buscar en "Potencia contratada" o "Término de potencia". Son kW, no el precio.

PRECIOS UNITARIOS (del desglose, no los importes):
- powerPriceEurKwDayByPeriod: el €/kW día de cada «Término potencia P1..P6». En 2.0TD, P1 y P2 pueden ser distintos. El resto a 0.
- energyPriceEurKwhByPeriod: el €/kWh de Punta/Llano/Valle o de P1..P6. Si la factura trae un solo €/kWh para todo el consumo, repetirlo en P1–P3 (2.0TD) o en P1–P6 (3.0 y 6.x).
- No uses la lectura del contador ni «Lecturas reales» como kWh ni como precio. El kWh es el de «Consumos».

CUPS:
- cups es el «Código CUPS» del suministro. Empieza por ES, 16 dígitos y 2 letras. Quita los espacios. No lo dejes null si esa etiqueta está en la factura.

BONO SOCIAL (socialBonusCostEur):
- Importe de «Financiación de Bono Social» o «Financiación del bono social»: el total de esa línea, no el €/día. En una pyme puede pasar de 5 €. Si esa línea existe, no lo dejes null.

GAS (gasCategory):
- RL1 ≤ 5.000 kWh/año; RL2 hasta 15.000; RL3 hasta 50.000; RL4 hasta 300.000; RL5 por encima. Si no hay consumo anual, null.
- gasConsumoKwh: kWh del período.
- gasPrecioVariableEurKwh: término variable EUR/kWh.
- gasTerminoFijoEurDia: cuota fija EUR/día.
- gasIhc*: impuesto de hidrocarburos.
- gasTasasEspecialesEur, gasCanonIrcEur, gasOtrosServiciosEur, gasImpuestoIndirectoPct según aparezcan.

ALQUILER (meterRentalAmount): importe del período, sin mensualizar.
TOTAL (totalAmountEur): importe final con impuestos. Una rectificativa puede ser negativa.`

function errorResponse(status: number, message: string, request: Request): Response {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { ...corsHeadersFor(request), "Content-Type": "application/json" },
  })
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
}

function normalizePeriods(value: unknown): number[] {
  const source = Array.isArray(value) ? value : []
  const periods = source.map((item) => (typeof item === "number" && Number.isFinite(item) ? item : 0))
  while (periods.length < 6) periods.push(0)
  return periods.slice(0, 6)
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function oneOf(value: unknown, allowed: string[]): string | null {
  return typeof value === "string" && allowed.includes(value) ? value : null
}

function normalizePayload(raw: unknown): Record<string, unknown> {
  const row = (raw ?? {}) as Record<string, unknown>
  return {
    status: "ok",
    cups: normalizeString(row.cups),
    companyBrand: normalizeString(row.companyBrand),
    holderNif: normalizeString(row.holderNif),
    holderName: normalizeString(row.holderName),
    invoiceDate: normalizeString(row.invoiceDate),
    invoiceDays: normalizeNumber(row.invoiceDays),
    supplyType: oneOf(row.supplyType, ["luz", "gas"]),
    segment: oneOf(row.segment, ["residencial", "pyme"]),
    electricityCategory: normalizeString(row.electricityCategory),
    gasCategory: normalizeString(row.gasCategory),
    electricityTaxRegime: normalizeString(row.electricityTaxRegime),
    powerKwByPeriod: normalizePeriods(row.powerKwByPeriod),
    powerPriceEurKwDayByPeriod: normalizePeriods(row.powerPriceEurKwDayByPeriod),
    powerCostEur: normalizeNumber(row.powerCostEur),
    energyKwhByPeriod: normalizePeriods(row.energyKwhByPeriod),
    energyPriceEurKwhByPeriod: normalizePeriods(row.energyPriceEurKwhByPeriod),
    energyCostEur: normalizeNumber(row.energyCostEur),
    meterRentalAmount: normalizeNumber(row.meterRentalAmount),
    socialBonusCostEur: normalizeNumber(row.socialBonusCostEur),
    financingSocialBonusAmount: normalizeNumber(row.financingSocialBonusAmount),
    otherCosts: normalizeNumber(row.otherCosts),
    totalAmountEur: normalizeNumber(row.totalAmountEur),
    gasConsumoKwh: normalizeNumber(row.gasConsumoKwh),
    gasPrecioVariableEurKwh: normalizeNumber(row.gasPrecioVariableEurKwh),
    gasTerminoFijoEurDia: normalizeNumber(row.gasTerminoFijoEurDia),
    gasTerminoFijoEurTotal: normalizeNumber(row.gasTerminoFijoEurTotal),
    gasIhcCantidadKwh: normalizeNumber(row.gasIhcCantidadKwh),
    gasIhcPrecioEurKwh: normalizeNumber(row.gasIhcPrecioEurKwh),
    gasIhcTotalEur: normalizeNumber(row.gasIhcTotalEur),
    gasTasasEspecialesEur: normalizeNumber(row.gasTasasEspecialesEur),
    gasCanonIrcEur: normalizeNumber(row.gasCanonIrcEur),
    gasOtrosServiciosEur: normalizeNumber(row.gasOtrosServiciosEur),
    gasOtrosConceptosEur: normalizeNumber(row.gasOtrosConceptosEur),
    gasImpuestoIndirectoPct: normalizeNumber(row.gasImpuestoIndirectoPct),
  }
}

Deno.serve(async (request: Request) => {
  const optionsResponse = handleOptions(request)
  if (optionsResponse) return optionsResponse

  if (request.method !== "POST") return errorResponse(405, "Método no permitido", request)

  const apiKey = Deno.env.get("GEMINI_API_KEY")
  if (!apiKey) return errorResponse(500, "GEMINI_API_KEY no configurada", request)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse(400, "No se pudo leer el formulario", request)
  }

  const files: File[] = []
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && (key === "file" || /^file_\d+$/.test(key))) files.push(value)
  }

  if (files.length === 0) return errorResponse(400, "No se adjuntó ningún archivo", request)
  if (files.length > MAX_FILES) return errorResponse(400, `Máximo ${MAX_FILES} archivos`, request)

  const pdfCount = files.filter(isPdf).length
  if (pdfCount > 1) return errorResponse(400, "Solo se admite un PDF", request)
  if (pdfCount === 1 && files.length > 1) return errorResponse(400, "El PDF se envía solo, sin imágenes", request)

  for (const file of files) {
    const pdf = isPdf(file)
    const limit = pdf ? MAX_PDF_BYTES : MAX_IMG_BYTES
    if (file.size > limit) {
      return errorResponse(400, `${file.name} supera el límite (${pdf ? "20" : "10"} MB)`, request)
    }
  }

  const parts: Record<string, unknown>[] = [
    { text: "Extrae los datos de esta factura según el esquema JSON." },
  ]
  for (const file of files) {
    const base64 = await fileToBase64(file)
    parts.push({
      inlineData: {
        mimeType: file.type || (isPdf(file) ? "application/pdf" : "application/octet-stream"),
        data: base64,
      },
    })
  }

  let geminiRes: Response
  try {
    geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
          temperature: 0,
          maxOutputTokens: 1024,
        },
      }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "error de red"
    return errorResponse(502, `No se pudo contactar con Gemini: ${message}`, request)
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => "")
    return errorResponse(502, `Gemini error ${geminiRes.status}: ${errText.slice(0, 400)}`, request)
  }

  const geminiJson = await geminiRes.json().catch(() => null) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  } | null
  const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) return errorResponse(502, "Gemini no devolvió contenido", request)

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return errorResponse(502, "Respuesta de Gemini no es JSON válido", request)
  }

  return new Response(JSON.stringify(normalizePayload(parsed)), {
    status: 200,
    headers: { ...corsHeadersFor(request), "Content-Type": "application/json" },
  })
})
