import { companiesTariffsCatalog } from "@/data/tarifas-catalog"
import { normalizeComparadorAccessTariff } from "./comparador-access-tariff"
import type { ComparadorInvoiceExtraction } from "./comparador-invoice-extraction"
import {
  analyzeInvoiceWithAi,
  isInvoiceAiConfigured,
} from "./comparador/invoice-ai-client"
import { mapInvoiceAiToComparadorExtraction } from "./comparador/invoice-ai-to-comparador"
import { mergeComparadorBillingFromOcrText } from "./comparador-invoice-billing-merge"
import {
  extractContractDataFromDocument,
  extractDocumentTextForOcr,
  parseContractTextFromOcr,
} from "./contract-ocr"

function localOcrToComparadorExtraction(
  parsed: ReturnType<typeof parseContractTextFromOcr>
): ComparadorInvoiceExtraction {
  return {
    ...parsed,
    source: "local-ocr",
    segment: parsed.segment,
    accessTariff: parsed.accessTariff,
    potenciasKw: parsed.potenciasKw,
    consumosKwh: parsed.consumosKwh,
    preciosPotenciaEur: parsed.preciosPotenciaEur,
    preciosEnergiaEur: parsed.preciosEnergiaEur,
    diasFacturados: parsed.diasFacturados,
    meterRentalAmount: parsed.meterRentalAmount,
    socialBonusCostEur: parsed.socialBonusCostEur,
    otherCosts: parsed.otherCosts,
  }
}

export async function extractComparadorInvoiceFromFiles(
  files: File[],
  onProgress?: (message: string) => void
): Promise<ComparadorInvoiceExtraction> {
  if (files.length === 0) throw new Error("Selecciona al menos un archivo.")

  if (files.length > 1) {
    onProgress?.("Varias imágenes: OCR solo en la primera (activa IA para unir páginas).")
  }

  const { text: ocrText } = await extractDocumentTextForOcr(files[0], onProgress)
  const localParsed = parseContractTextFromOcr(ocrText)

  if (isInvoiceAiConfigured()) {
    try {
      onProgress?.("Analizando con IA…")
      const companies = [
        ...new Set(
          Object.values(companiesTariffsCatalog).flatMap((byCompany) => Object.keys(byCompany))
        ),
      ]
      const payload = await analyzeInvoiceWithAi(files, {
        onProgress,
        companyCandidates: companies,
      })
      const aiMapped = mapInvoiceAiToComparadorExtraction(payload)
      onProgress?.("Ajustando alquiler, total y SVA con lectura de factura…")
      return mergeComparadorBillingFromOcrText(aiMapped, ocrText, localParsed)
    } catch (err) {
      console.warn("Invoice AI falló, usando OCR local:", err)
      onProgress?.("IA no disponible. Leyendo factura localmente…")
    }
  }

  const localBase = localOcrToComparadorExtraction(localParsed)
  return mergeComparadorBillingFromOcrText(localBase, ocrText, localParsed)
}
