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
  gasConsumoKwh?: number
  gasPrecioVariableEurKwh?: number
  gasTerminoFijoEurDia?: number
  gasTerminoFijoEurTotal?: number
  gasIhcCantidadKwh?: number
  gasIhcPrecioEurKwh?: number
  gasIhcTotalEur?: number
  gasTasasEspecialesEur?: number
  gasCanonIrcEur?: number
  gasOtrosServiciosEur?: number
  gasOtrosConceptosEur?: number
  gasImpuestoIndirectoPct?: number
}
