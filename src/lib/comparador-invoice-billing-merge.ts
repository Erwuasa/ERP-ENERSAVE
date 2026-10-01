import type { ContractOcrResult } from "./contract-ocr"
import type { ComparadorInvoiceExtraction } from "./comparador-invoice-extraction"
import {
  extractDiasFacturadosFromInvoice,
  extractInvoicePeriodConsumoKwh,
  extractInvoiceTotalAmountEur,
  extractMeterRentalAmountEur,
  extractServiciosSvaAmountEur,
  extractSocialBonusFinancingEur,
  scalePeriodConsumoToMonthlyKwh,
} from "./invoice-ocr-billing-lines"
import type { ComparadorPeriodValues } from "./erp/comparador-rates"

const MAX_PLAUSIBLE_SVA_EUR = 80

/** La IA a veces devuelve el importe total de la factura en otherCosts / SVA. */
export function sanitizeAiOtherCosts(
  otherCosts: number | undefined,
  facturaTotal: number | undefined,
  extraServicesTotal: number
): number | undefined {
  let value = otherCosts

  if (facturaTotal != null && value != null && Math.abs(value - facturaTotal) < 0.05) {
    value = undefined
  }
  if (value != null && value > MAX_PLAUSIBLE_SVA_EUR) {
    value = undefined
  }
  if (extraServicesTotal > 0 && extraServicesTotal <= MAX_PLAUSIBLE_SVA_EUR) {
    if (value == null || value > extraServicesTotal * 3) {
      value = extraServicesTotal
    }
  }
  return value != null && value > 0 ? value : undefined
}

function pickBillingNumber(
  ...candidates: (number | undefined)[]
): number | undefined {
  for (const value of candidates) {
    if (value != null && Number.isFinite(value) && value >= 0) return value
  }
  return undefined
}

/**
 * Prioriza líneas de factura (OCR) sobre la IA para alquiler, total y SVA.
 */
export function mergeComparadorBillingFromOcrText(
  extraction: ComparadorInvoiceExtraction,
  ocrText: string,
  localParsed?: ContractOcrResult
): ComparadorInvoiceExtraction {
  const meterRental = pickBillingNumber(
    extractMeterRentalAmountEur(ocrText),
    localParsed?.meterRentalAmount,
    extraction.meterRentalAmount
  )

  const invoiceTotal = pickBillingNumber(
    extractInvoiceTotalAmountEur(ocrText),
    localParsed?.facturaImporteEur,
    extraction.facturaImporteEur
  )

  const serviciosSva = pickBillingNumber(
    extractServiciosSvaAmountEur(ocrText),
    localParsed?.otherCosts,
    extraction.otherCosts
  )

  let otherCosts = serviciosSva
  if (
    invoiceTotal != null &&
    otherCosts != null &&
    Math.abs(otherCosts - invoiceTotal) < 0.05
  ) {
    otherCosts = extractServiciosSvaAmountEur(ocrText) ?? localParsed?.otherCosts
  }
  if (otherCosts != null && otherCosts > MAX_PLAUSIBLE_SVA_EUR) {
    otherCosts = undefined
  }

  const dias = pickBillingNumber(
    extractDiasFacturadosFromInvoice(ocrText),
    localParsed?.diasFacturados,
    extraction.diasFacturados
  )

  const socialBonus = pickBillingNumber(
    extractSocialBonusFinancingEur(ocrText),
    localParsed?.socialBonusCostEur,
    extraction.socialBonusCostEur
  )

  let consumosKwh: ComparadorPeriodValues | undefined = extraction.consumosKwh
  const periodFromRules = extractInvoicePeriodConsumoKwh(ocrText)
  const periodRuleSum = periodFromRules
    ? periodFromRules.p1 + periodFromRules.p2 + periodFromRules.p3
    : 0
  if (periodFromRules && periodRuleSum > 0) {
    const scaled = scalePeriodConsumoToMonthlyKwh(periodFromRules, dias ?? 30)
    consumosKwh = {
      p1: scaled.p1,
      p2: scaled.p2,
      p3: scaled.p3,
      p4: 0,
      p5: 0,
      p6: 0,
    }
  } else {
    const localConsumoSum =
      (localParsed?.consumosKwh?.p1 ?? 0) +
      (localParsed?.consumosKwh?.p2 ?? 0) +
      (localParsed?.consumosKwh?.p3 ?? 0)
    if (localParsed?.consumosKwh && localConsumoSum > 0) {
      consumosKwh = localParsed.consumosKwh
    }
  }

  const periodKwh = extractInvoicePeriodConsumoKwh(ocrText)
  const periodSum = periodKwh
    ? periodKwh.p1 + periodKwh.p2 + periodKwh.p3
    : 0
  const consumoAnualKwh =
    localParsed?.consumoAnualKwh ??
    (periodSum > 0 && dias
      ? Math.round((periodSum / dias) * 365)
      : extraction.consumoAnualKwh)

  const facturaEsMensual =
    localParsed?.facturaEsMensual ??
    extraction.facturaEsMensual ??
    (dias != null ? dias <= 35 : true)

  return {
    ...extraction,
    compania: localParsed?.compania ?? extraction.compania,
    meterRentalAmount: meterRental,
    facturaImporteEur: invoiceTotal,
    otherCosts,
    socialBonusCostEur: socialBonus,
    diasFacturados: dias,
    consumosKwh,
    consumoAnualKwh,
    facturaEsMensual,
    rawTextPreview: extraction.rawTextPreview ?? ocrText.slice(0, 1200),
  }
}
