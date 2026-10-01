import type { ComparadorAccessTariff } from "./erp/comparador-rates"
import { normalizeComparadorAccessTariff } from "./comparador-access-tariff"
import type { ComparadorPeriodValues } from "./erp/comparador-rates"
import {
  extractDiasFacturadosFromInvoice,
  extractInvoicePeriodConsumoKwh,
  extractInvoiceTotalAmountEur,
  extractMeterRentalAmountEur,
  extractServiciosSvaAmountEur,
  extractSocialBonusFinancingEur,
  parseSpanishInvoiceAmount,
  scalePeriodConsumoToMonthlyKwh,
} from "./invoice-ocr-billing-lines"

export interface ContractOcrResult {
  tipo?: "luz" | "gas"
  segment?: "residencial" | "pyme"
  fechaInicio?: string
  cups?: string
  tarifa?: string
  compania?: string
  accessTariff?: ComparadorAccessTariff
  tipoPrecio?: "fijo" | "mercado"
  potenciaContratada?: string
  potenciasKw?: ComparadorPeriodValues
  consumosKwh?: ComparadorPeriodValues
  preciosPotenciaEur?: ComparadorPeriodValues
  preciosEnergiaEur?: ComparadorPeriodValues
  diasFacturados?: number
  meterRentalAmount?: number
  socialBonusCostEur?: number
  otherCosts?: number
  precioFijoConsumo?: number
  consumoAnualKwh?: number
  facturaImporteEur?: number
  facturaEsMensual?: boolean
  nif?: string
  iban?: string
  direccionSuministro?: string
  rawTextPreview?: string
  pageCount?: number
}

function parseSpanishDecimal(raw: string): number {
  return parseSpanishInvoiceAmount(raw)
}

function matchPeriodKwh(text: string, labels: RegExp): number | undefined {
  const m = text.match(labels)
  if (!m?.[1]) return undefined
  const value = parseSpanishDecimal(m[1])
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
}

function parseSpanishDate(raw: string): string | undefined {
  const m = raw.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (!m) return undefined
  const day = m[1].padStart(2, "0")
  const month = m[2].padStart(2, "0")
  let year = m[3]
  if (year.length === 2) year = `20${year}`
  return `${year}-${month}-${day}`
}

export function parseContractTextFromOcr(fullText: string): ContractOcrResult {
  const text = normalizeText(fullText)
  const upper = text.toUpperCase()
  const result: ContractOcrResult = { rawTextPreview: text.slice(0, 1200) }

  const cupsMatch = upper.match(/ES\d{16,22}[A-Z]{0,2}/)
  if (cupsMatch) result.cups = cupsMatch[0]

  const ibanMatch = text.replace(/\s/g, "").match(/ES\d{22}/i)
  if (ibanMatch) {
    const iban = ibanMatch[0].toUpperCase()
    result.iban = `${iban.slice(0, 4)} ${iban.slice(4, 8)} ${iban.slice(8, 12)} ${iban.slice(12, 16)} ${iban.slice(16, 20)} ${iban.slice(20)}`
  }

  const nifPatterns = [
    /\b[XYZ]\d{7}[A-Z]\b/i,
    /\b\d{8}[A-Z]\b/i,
    /\b[A-HJ-NP-SUVW]\d{7}[0-9A-J]\b/i,
    /\b[A-HJ-NP-SUVW]\d{8}\b/i,
  ]
  for (const pattern of nifPatterns) {
    const nifMatch = upper.match(pattern)
    if (nifMatch) {
      result.nif = nifMatch[0]
      break
    }
  }

  if (/\bGAS\b|GNL|RL\.?\s*[123]|NATURAL\b/i.test(text)) {
    result.tipo = "gas"
  } else if (/\bLUZ\b|ELECTRIC|2\.0\s*TD|3\.0\s*TD|6\.0\s*TD|SUMINISTRO\s+EL[EÉ]CTRIC/i.test(text)) {
    result.tipo = "luz"
  }

  const companies = [
    "Gana Energía",
    "Gana Energia",
    "Iberdrola",
    "Endesa",
    "Naturgy",
    "Repsol",
    "TotalEnergies",
    "Total Energies",
    "Repsol",
    "Niba",
    "Ignis",
    "Axpo",
    "Octopus",
    "Factorenergia",
  ]
  for (const company of companies) {
    if (upper.includes(company.toUpperCase())) {
      result.compania = company
      break
    }
  }

  if (/\bINDEXAD|POOL|OMIE|MERCADO|VARIABLE\b/i.test(text)) {
    result.tipoPrecio = "mercado"
    result.tarifa = result.tarifa || "Indexada / Pool"
  } else if (/\bFIJ[OA]|PRECIO\s+FIJO|TARIFA\s+FIJA\b/i.test(text)) {
    result.tipoPrecio = "fijo"
    result.tarifa = result.tarifa || "Tarifa fija"
  }

  const accessDetected = normalizeComparadorAccessTariff(upper)
  if (/2\.0\s*TD|2,0\s*TD/.test(text)) {
    result.accessTariff = accessDetected
  } else if (/3\.0\s*TD|3,0\s*TD/.test(text)) {
    result.accessTariff = normalizeComparadorAccessTariff("3.0TD")
  } else if (/6\.[0-9]\s*TD/.test(text)) {
    result.accessTariff = normalizeComparadorAccessTariff("6.1TD")
  }

  const periodConsumo = extractInvoicePeriodConsumoKwh(text)
  if (periodConsumo && periodConsumo.p1 + periodConsumo.p2 + periodConsumo.p3 > 0) {
    const diasForScale =
      extractDiasFacturadosFromInvoice(text) ?? result.diasFacturados ?? 30
    const scaled = scalePeriodConsumoToMonthlyKwh(periodConsumo, diasForScale)
    result.consumosKwh = {
      p1: scaled.p1,
      p2: scaled.p2,
      p3: scaled.p3,
      p4: 0,
      p5: 0,
      p6: 0,
    }
    const sum = periodConsumo.p1 + periodConsumo.p2 + periodConsumo.p3
    if (sum > 0 && diasForScale > 0) {
      result.consumoAnualKwh = Math.round((sum / diasForScale) * 365)
    }
  } else {
    const p1Kwh = matchPeriodKwh(text, /(?:Punta|P1)[^\d]{0,50}(\d+[,.]\d+)\s*kWh/i)
    const p2Kwh = matchPeriodKwh(text, /(?:Llano|P2|Plano)[^\d]{0,50}(\d+[,.]\d+)\s*kWh/i)
    const p3Kwh = matchPeriodKwh(text, /(?:Valle|P3)[^\d]{0,50}(\d+[,.]\d+)\s*kWh/i)
    if (p1Kwh != null || p2Kwh != null || p3Kwh != null) {
      result.consumosKwh = {
        p1: p1Kwh ?? 0,
        p2: p2Kwh ?? 0,
        p3: p3Kwh ?? 0,
        p4: 0,
        p5: 0,
        p6: 0,
      }
      const sum = (p1Kwh ?? 0) + (p2Kwh ?? 0) + (p3Kwh ?? 0)
      const dias = result.diasFacturados ?? 30
      if (sum > 0 && !result.consumoAnualKwh) {
        result.consumoAnualKwh = Math.round((sum / dias) * 365)
      }
    }
  }

  const potPunta = matchPeriodKwh(
    text,
    /Potencia[^\n]{0,80}?(?:Punta|P1)[^\d]{0,30}(\d+[,.]\d+)\s*kW/i
  )
  const potValle = matchPeriodKwh(
    text,
    /Potencia[^\n]{0,120}?(?:Valle|P3)[^\d]{0,30}(\d+[,.]\d+)\s*kW/i
  )
  if (potPunta != null || potValle != null) {
    const p1 = potPunta ?? potValle ?? 0
    const p2 = potValle ?? potPunta ?? p1
    result.potenciasKw = { p1, p2, p3: 0, p4: 0, p5: 0, p6: 0 }
    result.potenciaContratada = String(p1).replace(".", ",")
  } else {
    const potenciaMatch = text.match(/(\d+[,.]?\d*)\s*kW/i)
    if (potenciaMatch) {
      result.potenciaContratada = potenciaMatch[1].replace(",", ".")
    }
  }

  const diasLabel = extractDiasFacturadosFromInvoice(text)
  if (diasLabel != null) {
    result.diasFacturados = diasLabel
  } else {
    const diasMatch = text.match(/(\d{1,3})\s*d[ií]as/i)
    if (diasMatch) {
      const days = Number.parseInt(diasMatch[1], 10)
      if (days > 0 && days < 400) result.diasFacturados = days
    }
  }

  const meterRental = extractMeterRentalAmountEur(text)
  if (meterRental != null) {
    result.meterRentalAmount = meterRental
  }

  const bonoFinanciacion = extractSocialBonusFinancingEur(text)
  if (bonoFinanciacion != null) {
    result.socialBonusCostEur = bonoFinanciacion
  } else {
    const bonoMatch = text.match(
      /(?:Financiaci[oó]n\s+Bono\s+Social|bono\s+social)[^\d]{0,40}(\d+[,.]\d+)\s*€/i
    )
    if (bonoMatch) {
      result.socialBonusCostEur = parseSpanishDecimal(bonoMatch[1])
    }
  }

  const serviciosSva = extractServiciosSvaAmountEur(text)
  if (serviciosSva != null) {
    result.otherCosts = serviciosSva
  } else {
    const urgenciasMatch = text.match(/Urgencias[^\d]{0,30}(\d+[,.]\d+)\s*€/i)
    if (urgenciasMatch) {
      result.otherCosts = (result.otherCosts ?? 0) + parseSpanishDecimal(urgenciasMatch[1])
    }
  }

  const precioMatch =
    text.match(/(\d+[,.]\d{3,6})\s*(?:€|EUR)?\s*\/\s*kWh/i) ||
    text.match(/PRECIO\s+(?:ENERG[IÍ]A|KWH)[^\d]{0,20}(\d+[,.]\d{2,6})/i)
  if (precioMatch) {
    result.precioFijoConsumo = parseFloat(precioMatch[1].replace(",", "."))
  }

  const fechaInicioMatch =
    text.match(/(?:fecha\s+de\s+)?(?:inicio|activaci[oó]n|alta)[^\d]{0,25}(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) ||
    text.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/)
  if (fechaInicioMatch) {
    result.fechaInicio = parseSpanishDate(fechaInicioMatch[1])
  }

  const dirMatch = text.match(
    /(?:direcci[oó]n\s+de\s+suministro|suministro\s+en|domicilio)[:\s]+([^\n]{10,120})/i
  )
  if (dirMatch) {
    result.direccionSuministro = dirMatch[1].trim().slice(0, 120)
  }

  const consumoAnualMatch =
    text.match(/consumo\s+anual[^\d]{0,25}(\d[\d.,]*)\s*kWh/i) ||
    text.match(/(\d[\d.,]*)\s*kWh\s*(?:\/\s*año|anual)/i)
  if (consumoAnualMatch) {
    const raw = consumoAnualMatch[1].replace(/\./g, "").replace(",", ".")
    const value = Number.parseFloat(raw)
    if (Number.isFinite(value) && value > 0) result.consumoAnualKwh = Math.round(value)
  }

  const invoiceTotal = extractInvoiceTotalAmountEur(text)
  if (invoiceTotal != null) {
    result.facturaImporteEur = invoiceTotal
    const periodDays = result.diasFacturados ?? 30
    result.facturaEsMensual = periodDays <= 31
  } else {
    const facturaMatch =
      text.match(/TOTAL\s+IMPORTE\s+FACTURA[^\d]{0,20}(\d+[,.]\d+)\s*€/i) ||
      text.match(/total\s+(?:factura|importe|a\s+pagar)[^\d]{0,20}(\d+[,.]?\d*)\s*€/i) ||
      text.match(/(\d+[,.]?\d*)\s*€[^\n]{0,30}(?:total|importe)/i)
    if (facturaMatch) {
      const value = parseSpanishDecimal(facturaMatch[1])
      if (Number.isFinite(value) && value > 0) {
        result.facturaImporteEur = value
        const periodDays = result.diasFacturados ?? 30
        result.facturaEsMensual =
          periodDays <= 31 && !/anual|año|12\s*meses/i.test(facturaMatch[0])
      }
    }
  }

  if (result.consumosKwh) {
    const { p1, p2, p3 } = result.consumosKwh
    const sum = p1 + p2 + p3
    if (sum > 0 && result.diasFacturados) {
      result.consumoAnualKwh = Math.round((sum / result.diasFacturados) * 365)
    }
  }

  return result
}

async function configurePdfWorker() {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).href
  return pdfjs
}

async function extractTextFromPdf(file: File): Promise<{ text: string; pageCount: number }> {
  const pdfjs = await configurePdfWorker()

  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const parts: string[] = []

  for (let page = 1; page <= pdf.numPages; page++) {
    const pageDoc = await pdf.getPage(page)
    const content = await pageDoc.getTextContent()
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
    parts.push(`--- Página ${page} ---\n${pageText}`)
  }

  return { text: parts.join("\n\n"), pageCount: pdf.numPages }
}

async function extractTextFromImage(file: File): Promise<{ text: string; pageCount: number }> {
  const { createWorker } = await import("tesseract.js")
  const worker = await createWorker("spa")
  try {
    const { data } = await worker.recognize(file)
    return { text: data.text, pageCount: 1 }
  } finally {
    await worker.terminate()
  }
}

export async function extractDocumentTextForOcr(
  file: File,
  onProgress?: (message: string) => void
): Promise<{ text: string; pageCount: number }> {
  onProgress?.("Leyendo documento…")

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  const isImage = file.type.startsWith("image/")

  let text = ""
  let pageCount = 1

  if (isPdf) {
    onProgress?.("Extrayendo texto de todas las páginas del PDF…")
    const pdfResult = await extractTextFromPdf(file)
    text = pdfResult.text
    pageCount = pdfResult.pageCount

    if (text.replace(/\s/g, "").length < 80) {
      onProgress?.("PDF escaneado: aplicando OCR por página…")
      const { createWorker } = await import("tesseract.js")
      const worker = await createWorker("spa")
      try {
        const pdfjs = await configurePdfWorker()
        const data = new Uint8Array(await file.arrayBuffer())
        const pdf = await pdfjs.getDocument({ data }).promise
        const ocrParts: string[] = []
        for (let page = 1; page <= pdf.numPages; page++) {
          onProgress?.(`OCR página ${page} de ${pdf.numPages}…`)
          const pageDoc = await pdf.getPage(page)
          const viewport = pageDoc.getViewport({ scale: 2.75 })
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) continue
          canvas.width = viewport.width
          canvas.height = viewport.height
          await pageDoc.render({ canvasContext: ctx, viewport, canvas }).promise
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/png")
          )
          if (blob) {
            const { data: ocrData } = await worker.recognize(blob)
            ocrParts.push(`--- Página ${page} ---\n${ocrData.text}`)
          }
        }
        text = ocrParts.join("\n\n")
        pageCount = pdf.numPages
      } finally {
        await worker.terminate()
      }
    }
  } else if (isImage) {
    onProgress?.("Aplicando OCR a la imagen…")
    const imgResult = await extractTextFromImage(file)
    text = imgResult.text
    pageCount = imgResult.pageCount
  } else {
    throw new Error("Formato no soportado. Usa PDF o imagen (JPG, PNG).")
  }

  return { text, pageCount }
}

export async function extractContractDataFromDocument(
  file: File,
  onProgress?: (message: string) => void
): Promise<ContractOcrResult> {
  const { text, pageCount } = await extractDocumentTextForOcr(file, onProgress)
  onProgress?.("Interpretando datos del contrato…")
  const parsed = parseContractTextFromOcr(text)
  return { ...parsed, pageCount }
}
