import type { ContractOcrResult } from "./contract-ocr"
import type { ComparadorAccessTariff } from "./erp/comparador-rates"
import type { ComparadorPeriodValues } from "./erp/comparador-rates"

/** Datos extraídos de factura orientados al comparador (OCR local o Invoice AI). */
export interface ComparadorInvoiceExtraction extends ContractOcrResult {
  source?: "local-ocr" | "invoice-ai"
  segment?: "residencial" | "pyme"
  accessTariff?: ComparadorAccessTariff
  potenciasKw?: ComparadorPeriodValues
  consumosKwh?: ComparadorPeriodValues
  preciosPotenciaEur?: ComparadorPeriodValues
  preciosEnergiaEur?: ComparadorPeriodValues
  diasFacturados?: number
  meterRentalAmount?: number
  socialBonusCostEur?: number
  financingSocialBonusAmount?: number
  otherCosts?: number
  electricityTaxRegime?: string
  consumptionFromProfile?: boolean
}
