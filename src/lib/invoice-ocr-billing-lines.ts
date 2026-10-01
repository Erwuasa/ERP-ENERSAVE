const MAX_PLAUSIBLE_SVA_EUR = 80

/** Variantes de texto (OCR escaneado: espacios, acentos, O/0). */
export function invoiceTextExtractionVariants(fullText: string): string[] {
  const normalized = fullText
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\bkwh\b/gi, "kWh")
    .replace(/Financiaci[oó]n/gi, "Financiacion")
    .replace(/electricidad/gi, "electricidad")
  const ascii = normalized.normalize("NFD").replace(/\p{M}/gu, "")
  const unique = new Set([fullText, normalized, ascii].filter((s) => s.trim().length > 0))
  return [...unique]
}

/** Normaliza importes con coma decimal (facturas ES). */
export function parseSpanishInvoiceAmount(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, "")
  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number.parseFloat(cleaned.replace(/\./g, "").replace(",", "."))
  }
  if (cleaned.includes(",")) {
    return Number.parseFloat(cleaned.replace(",", "."))
  }
  return Number.parseFloat(cleaned)
}

/**
 * Alquiler contador = alquiler de equipos = alquiler equipos de medida (misma línea en factura).
 * Preferir importe del periodo facturado (con impuestos si consta).
 */
function isPlausibleMeterRental(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 15
}

function parseOcrKwhToken(raw: string): number {
  const fixed = raw
    .replace(/O/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(",", ".")
  return Number.parseFloat(fixed)
}

function extractMeterRentalFromSingleText(text: string): number | undefined {
  const patterns = [
    /Alquiler\s+de\s+contador[\s\S]{0,250}?[=:]\s*(\d+[,.]\d{1,2})\s*€?/gi,
    /Alquiler\s+(?:de\s+)?contador[^\d]{0,120}(\d+[,.]\d{1,2})\s*€?/gi,
    /Alquiler\s+(?:de\s+)?equipos(?:\s+de\s+medida|\s+medida)?[^\d]{0,120}(\d+[,.]\d{1,2})\s*€?/gi,
    /Alquiler\s+contador[^\d]{0,120}(\d+[,.]\d{1,2})\s*€?/gi,
    /Alquiler[^\n]{0,40}(?:contador|equipos)[^\d]{0,120}(\d+[,.]\d{1,2})\s*€?/gi,
  ]

  let matchValue: number | undefined
  for (const pattern of patterns) {
    for (const m of text.matchAll(pattern)) {
      const value = parseSpanishInvoiceAmount(m[1])
      if (isPlausibleMeterRental(value)) matchValue = value
    }
  }

  if (matchValue != null) return matchValue

  const equiposMedida = text.match(
    /Equipos\s+de\s+medida[^\d]{0,50}(\d+[,.]\d{1,2})\s*€/i
  )
  if (equiposMedida?.[1]) {
    const value = parseSpanishInvoiceAmount(equiposMedida[1])
    if (isPlausibleMeterRental(value)) return value
  }

  const anchor = text.search(/Alquiler\s+(?:de\s+)?(?:contador|equipos)|Equipos\s+de\s+medida/i)
  if (anchor >= 0) {
    const window = text.slice(anchor, anchor + 280)
    for (const m of window.matchAll(/(\d+[,.]\d{1,2})\s*€?/g)) {
      const value = parseSpanishInvoiceAmount(m[1])
      if (isPlausibleMeterRental(value)) return value
    }
  }

  return undefined
}

export function extractMeterRentalAmountEur(text: string): number | undefined {
  for (const variant of invoiceTextExtractionVariants(text)) {
    const value = extractMeterRentalFromSingleText(variant)
    if (value != null) return value
  }
  return undefined
}

/**
 * Total a pagar del periodo (luz + potencia + SVA + impuestos IE/IVA).
 * Prioridad: etiquetas de resumen de la 1ª página.
 */
function parseInvoiceTotalCandidate(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const value = parseSpanishInvoiceAmount(raw)
  if (!Number.isFinite(value) || value < 15) return undefined
  return value
}

export function extractInvoiceTotalAmountEur(text: string): number | undefined {
  const normalized = text.replace(/\s+/g, " ")

  // TotalEnergies: importe global (luz + servicios + impuestos), 1ª página.
  const cuantoPagar = normalized.match(
    /(?:¿\s*)?CU[AÁ]NTO\s+(?:TIENES?|TENGO)\s+QUE\s+PAGAR[^\d]{0,80}(\d+[,.]\d+)\s*€?/i
  )
  const fromCuanto = parseInvoiceTotalCandidate(cuantoPagar?.[1])
  if (fromCuanto != null) return fromCuanto

  const porValor = normalized.match(
    /por\s+valor\s+de\s+(\d+[,.]\d+)\s*euros?/i
  )
  const fromPorValor = parseInvoiceTotalCandidate(porValor?.[1])
  if (fromPorValor != null) return fromPorValor

  const importeTotal = normalized.match(
    /Importe\s+total[^\d]{0,60}(\d+[,.]\d+)\s*€?/i
  )
  const fromImporteTotal = parseInvoiceTotalCandidate(importeTotal?.[1])
  if (fromImporteTotal != null) return fromImporteTotal

  const totalPagar = normalized.match(
    /Total\s+a\s+pagar[^\d]{0,60}(\d+[,.]\d+)\s*€?/i
  )
  const fromTotalPagar = parseInvoiceTotalCandidate(totalPagar?.[1])
  if (fromTotalPagar != null) return fromTotalPagar

  const totalPagarMatches: number[] = []
  for (const m of normalized.matchAll(/Total\s+a\s+pagar[^\d]{0,40}(\d+[,.]\d+)\s*€/gi)) {
    const value = parseInvoiceTotalCandidate(m[1])
    if (value != null) totalPagarMatches.push(value)
  }
  if (totalPagarMatches.length > 0) {
    return Math.max(...totalPagarMatches)
  }

  const totalFacturaMatches: number[] = []
  for (const m of normalized.matchAll(/Total\s+factura[^\d]{0,30}(\d+[,.]\d+)\s*€/gi)) {
    const value = parseInvoiceTotalCandidate(m[1])
    if (value != null) totalFacturaMatches.push(value)
  }
  if (totalFacturaMatches.length > 0) {
    return Math.max(...totalFacturaMatches)
  }

  // Solo electricidad (sin bloque SERVICIOS aparte): último recurso en TotalEnergies.
  const electricityTotals: number[] = []
  for (const pattern of [
    /IMPORTE\s+TOTAL\s+ELECTRICIDAD\s*\+\s*TASAS\s+E\s+IMPUESTOS[^\d]{0,40}(\d+[,.]\d+)\s*€?/gi,
    /IMPORTE\s+TOTAL\s+ELECTRICIDAD[^\d]{0,40}(\d+[,.]\d+)\s*€?/gi,
  ]) {
    for (const m of normalized.matchAll(pattern)) {
      const value = parseInvoiceTotalCandidate(m[1])
      if (value != null) electricityTotals.push(value)
    }
  }
  if (electricityTotals.length > 0) {
    return Math.max(...electricityTotals)
  }

  return undefined
}

/**
 * SVA / servicios contratados (bloque «SERVICIOS»). Preferir total con impuestos (ej. 8,49 vs 7,02).
 */
function extractRepsolServiciosAmountEur(text: string, normalized: string): number | undefined {
  if (!/Repsol|Factura de luz/i.test(text)) return undefined

  const summary = normalized.match(
    /(?:Energ[ií]a|T[eé]rmino fijo)\s+\d+[,.]\d+\s*€\s+Servicios\s+(\d+[,.]\d+)\s*€/i
  )
  if (summary?.[1]) {
    const value = parseSpanishInvoiceAmount(summary[1])
    if (Number.isFinite(value) && value > 0 && value <= MAX_PLAUSIBLE_SVA_EUR) {
      return value
    }
  }

  for (const m of normalized.matchAll(/\bServicios\s+(\d+[,.]\d+)\s*€/g)) {
    const value = parseSpanishInvoiceAmount(m[1])
    if (Number.isFinite(value) && value > 0 && value <= MAX_PLAUSIBLE_SVA_EUR) {
      return value
    }
  }
  return undefined
}

export function extractServiciosSvaAmountEur(text: string): number | undefined {
  const normalized = text.replace(/\s+/g, " ")

  const importeTotalServicios = normalized.match(
    /IMPORTE\s+TOTAL\s+SERVICIOS\s*\+\s*TASAS\s*E\s+IMPUESTOS[^\d]{0,60}(\d+[,.]\d+)\s*€?/i
  )
  if (importeTotalServicios?.[1]) {
    const value = parseSpanishInvoiceAmount(importeTotalServicios[1])
    if (Number.isFinite(value) && value > 0 && value <= MAX_PLAUSIBLE_SVA_EUR) {
      return value
    }
  }

  const sectionStart = text.search(
    /(?:---\s*Página\s+\d+\s*---|\n)\s*SERVICIOS\s+Per[ií]odo\s+facturaci[oó]n/im
  )
  if (sectionStart < 0) {
    return extractRepsolServiciosAmountEur(text, normalized)
  }

  let end = sectionStart + 2200
  const tail = text.slice(sectionStart + 10)
  const cutAt = tail.search(
    /Otra\s+informaci[oó]n|El\s+consumo\s+medio|INFORMACIÓN\s+ADICIONAL/i
  )
  if (cutAt >= 0 && cutAt < 2000) end = sectionStart + 10 + cutAt

  const block = text.slice(sectionStart, end)

  const totalLine =
    block.match(/IMPORTE\s+TOTAL\s+SERVICIOS\s*\+\s*TASAS[^\d]{0,60}(\d+[,.]\d+)\s*€?/i) ??
    block.match(/Total\s+servicios[^\d]{0,80}(\d+[,.]\d+)\s*€?/i)

  if (totalLine?.[1]) {
    const labeled = parseSpanishInvoiceAmount(totalLine[1])
    if (Number.isFinite(labeled) && labeled > 0 && labeled <= MAX_PLAUSIBLE_SVA_EUR) {
      return labeled
    }
  }

  const amounts: number[] = []
  for (const m of block.matchAll(/(\d+[,.]\d+)\s*€?/g)) {
    const value = parseSpanishInvoiceAmount(m[1])
    if (Number.isFinite(value) && value >= 0.5 && value <= MAX_PLAUSIBLE_SVA_EUR) {
      amounts.push(value)
    }
  }
  if (amounts.length === 0) {
    return extractRepsolServiciosAmountEur(text, normalized)
  }

  return Math.min(...amounts.filter((v) => v >= 5)) || Math.max(...amounts)
}

function invoiceDaysFromDateRange(
  startDay: string,
  startMonth: string,
  startYear: string,
  endDay: string,
  endMonth: string,
  endYear: string
): number | undefined {
  const toIso = (d: string, m: string, y: string) => {
    let year = y
    if (year.length === 2) year = `20${year}`
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  const start = new Date(toIso(startDay, startMonth, startYear))
  const end = new Date(toIso(endDay, endMonth, endYear))
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined
  const diffMs = end.getTime() - start.getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1
  if (days >= 1 && days <= 400) return days
  return undefined
}

export function extractDiasFacturadosFromInvoice(text: string): number | undefined {
  const labeled = text.match(/D[ií]as\s+facturados[^\d]{0,20}(\d{1,3})/i)
  if (labeled?.[1]) {
    const days = Number.parseInt(labeled[1], 10)
    if (days >= 1 && days <= 400) return days
  }

  const periodoElectricidad = text.match(
    /Periodo\s+electricidad[\s\S]{0,80}?(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})[\s\S]{0,40}?(?:al|a)\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/i
  )
  if (periodoElectricidad) {
    const days = invoiceDaysFromDateRange(
      periodoElectricidad[1],
      periodoElectricidad[2],
      periodoElectricidad[3],
      periodoElectricidad[4],
      periodoElectricidad[5],
      periodoElectricidad[6]
    )
    if (days != null) return days
  }

  const periodo = text.match(
    /Periodo\s+de\s+facturaci[oó]n[^\d]{0,40}(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\s*(?:[-–—]|a)\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/i
  )
  if (periodo) {
    const days = invoiceDaysFromDateRange(
      periodo[1],
      periodo[2],
      periodo[3],
      periodo[4],
      periodo[5],
      periodo[6]
    )
    if (days != null) return days
  }

  const fromAlquiler = text.match(
    /Alquiler\s+de\s+contador[^\d]{0,25}(\d{1,3})\s*d[ií]as/i
  )
  if (fromAlquiler?.[1]) {
    const days = Number.parseInt(fromAlquiler[1], 10)
    if (days >= 28 && days <= 62) return days
  }

  return undefined
}

function extractSocialBonusFromSingleText(text: string): number | undefined {
  const bonoBlock = text.match(
    /Financiacion\s+(?:de\s+)?Bono\s+Social[\s\S]{0,280}/i
  )
  if (bonoBlock?.[0]) {
    const equalsAmount = bonoBlock[0].match(/=\s*(\d+[,.]\d+)\s*€/)
    if (equalsAmount?.[1]) {
      const value = parseSpanishInvoiceAmount(equalsAmount[1])
      if (Number.isFinite(value) && value > 0) return value
    }
    const euroAmounts = [...bonoBlock[0].matchAll(/(\d+[,.]\d+)\s*€/g)]
    const last = euroAmounts.at(-1)?.[1]
    if (last) {
      const value = parseSpanishInvoiceAmount(last)
      if (Number.isFinite(value) && value > 0 && value <= 5) return value
    }
  }

  const otrosIdx = text.search(/\bOtros conceptos\b/i)
  const block =
    otrosIdx >= 0
      ? text.slice(otrosIdx, otrosIdx + 900)
      : text.slice(0, 4000)

  let sum = 0
  let found = false
  for (const m of block.matchAll(/Financiacion[\s\S]{0,120}?(\d+[,.]\d+)\s*€/gi)) {
    const value = parseSpanishInvoiceAmount(m[1])
    if (Number.isFinite(value) && value > 0) {
      sum += value
      found = true
    }
  }
  if (!found) return undefined
  return Math.round(sum * 100) / 100
}

/** Financiación del bono social (Naturgy explícito; Repsol: líneas bajo «Otros conceptos»). */
export function extractSocialBonusFinancingEur(text: string): number | undefined {
  for (const variant of invoiceTextExtractionVariants(text)) {
    const value = extractSocialBonusFromSingleText(variant)
    if (value != null) return value
  }
  return undefined
}

export interface InvoicePeriodConsumoKwh {
  p1: number
  p2: number
  p3: number
}

const KWH_AMOUNT = "([0-9OIl][0-9OIl.,]{0,10})\\s*kWh"

function parseKwhAmount(raw: string): number {
  const value = parseOcrKwhToken(raw)
  if (Number.isFinite(value)) return value
  return parseSpanishInvoiceAmount(raw)
}

function extractInvoicePeriodConsumoFromSingleText(
  text: string
): InvoicePeriodConsumoKwh | undefined {
  const naturgyPunta = text.match(
    new RegExp(`Consumo\\s+elec[a-z]*\\s+Punta[\\s\\S]{0,120}?${KWH_AMOUNT}`, "i")
  )
  const naturgyLlano = text.match(
    new RegExp(`Consumo\\s+elec[a-z]*\\s+Llano[\\s\\S]{0,120}?${KWH_AMOUNT}`, "i")
  )
  const naturgyValle = text.match(
    new RegExp(`Consumo\\s+elec[a-z]*\\s+Valle[\\s\\S]{0,120}?${KWH_AMOUNT}`, "i")
  )
  if (naturgyPunta?.[1] || naturgyLlano?.[1] || naturgyValle?.[1]) {
    return {
      p1: naturgyPunta?.[1] ? parseKwhAmount(naturgyPunta[1]) : 0,
      p2: naturgyLlano?.[1] ? parseKwhAmount(naturgyLlano[1]) : 0,
      p3: naturgyValle?.[1] ? parseKwhAmount(naturgyValle[1]) : 0,
    }
  }

  const puntaOnly = text.match(new RegExp(`Punta[\\s\\S]{0,100}?${KWH_AMOUNT}`, "i"))
  const llanoOnly = text.match(new RegExp(`(?:Llano|Plano)[\\s\\S]{0,100}?${KWH_AMOUNT}`, "i"))
  const valleOnly = text.match(new RegExp(`Valle[\\s\\S]{0,100}?${KWH_AMOUNT}`, "i"))
  if (puntaOnly?.[1] && llanoOnly?.[1] && valleOnly?.[1]) {
    const p1 = parseKwhAmount(puntaOnly[1])
    const p2 = parseKwhAmount(llanoOnly[1])
    const p3 = parseKwhAmount(valleOnly[1])
    if (p1 + p2 + p3 >= 20 && p1 + p2 + p3 <= 50000) {
      return { p1, p2, p3 }
    }
  }

  const repsolTable = text.match(
    new RegExp(
      `Consumo del periodo[\\s\\S]{0,120}?${KWH_AMOUNT}[\\s\\S]{0,60}?${KWH_AMOUNT}[\\s\\S]{0,60}?${KWH_AMOUNT}`,
      "i"
    )
  )
  if (repsolTable) {
    return {
      p1: parseKwhAmount(repsolTable[1]),
      p2: parseKwhAmount(repsolTable[2]),
      p3: parseKwhAmount(repsolTable[3]),
    }
  }

  const p1 = text.match(new RegExp(`Consumo[\\s\\S]{0,50}?Punta[\\s\\S]{0,80}?${KWH_AMOUNT}`, "i"))
  const p2 = text.match(
    new RegExp(`Consumo[\\s\\S]{0,50}?(?:Llano|Plano)[\\s\\S]{0,80}?${KWH_AMOUNT}`, "i")
  )
  const p3 = text.match(new RegExp(`Consumo[\\s\\S]{0,50}?Valle[\\s\\S]{0,80}?${KWH_AMOUNT}`, "i"))
  if (!p1?.[1] && !p2?.[1] && !p3?.[1]) return undefined

  return {
    p1: p1?.[1] ? parseKwhAmount(p1[1]) : 0,
    p2: p2?.[1] ? parseKwhAmount(p2[1]) : 0,
    p3: p3?.[1] ? parseKwhAmount(p3[1]) : 0,
  }
}

/** Consumo Punta / Llano / Valle del periodo facturado (Repsol, Naturgy, genérico). */
export function extractInvoicePeriodConsumoKwh(text: string): InvoicePeriodConsumoKwh | undefined {
  for (const variant of invoiceTextExtractionVariants(text)) {
    const value = extractInvoicePeriodConsumoFromSingleText(variant)
    if (value && value.p1 + value.p2 + value.p3 > 0) return value
  }
  return undefined
}

export function scalePeriodConsumoToMonthlyKwh(
  consumo: InvoicePeriodConsumoKwh,
  diasFacturados: number
): InvoicePeriodConsumoKwh {
  if (diasFacturados <= 0 || diasFacturados === 30) return consumo
  const factor = 30 / diasFacturados
  const scale = (v: number) => Math.round(v * factor * 100) / 100
  return { p1: scale(consumo.p1), p2: scale(consumo.p2), p3: scale(consumo.p3) }
}
