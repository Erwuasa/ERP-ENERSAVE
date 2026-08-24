export interface ContractOcrResult {
  tipo?: "luz" | "gas"
  fechaInicio?: string
  cups?: string
  tarifa?: string
  compania?: string
  tipoPrecio?: "fijo" | "mercado"
  potenciaContratada?: string
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
    "Iberdrola",
    "Endesa",
    "Naturgy",
    "Repsol",
    "TotalEnergies",
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

  const potenciaMatch = text.match(/(\d+[,.]?\d*)\s*kW/i)
  if (potenciaMatch) {
    result.potenciaContratada = potenciaMatch[1].replace(",", ".")
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

  const facturaMatch =
    text.match(/total\s+(?:factura|importe|a\s+pagar)[^\d]{0,20}(\d+[,.]?\d*)\s*€/i) ||
    text.match(/(\d+[,.]?\d*)\s*€[^\n]{0,30}(?:total|importe)/i)
  if (facturaMatch) {
    const value = Number.parseFloat(facturaMatch[1].replace(",", "."))
    if (Number.isFinite(value) && value > 0) {
      result.facturaImporteEur = value
      result.facturaEsMensual = !/anual|año|12\s*meses/i.test(facturaMatch[0])
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

export async function extractContractDataFromDocument(
  file: File,
  onProgress?: (message: string) => void
): Promise<ContractOcrResult> {
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
          const viewport = pageDoc.getViewport({ scale: 2 })
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

  onProgress?.("Interpretando datos del contrato…")
  const parsed = parseContractTextFromOcr(text)
  return { ...parsed, pageCount }
}
