import { isComparadorGasPeaje, normalizeComparadorAccessTariff } from "@/lib/comparador-access-tariff"
import type { ComparadorAccessTariff } from "@/lib/erp/comparador-rates"
import type { ComparadorInvoiceExtraction } from "@/lib/comparador-invoice-extraction"
import { sanitizeAiOtherCosts } from "@/lib/comparador-invoice-billing-merge"
import { resolveInvoiceSegment } from "@/lib/comparador-invoice-supply"
import type { InvoiceAiPublicPayload } from "./invoice-ai-types"

function periodArrayToRecord(values?: number[]): {
  p1: number
  p2: number
  p3: number
  p4: number
  p5: number
  p6: number
} {
  const v = values ?? []
  return {
    p1: v[0] ?? 0,
    p2: v[1] ?? 0,
    p3: v[2] ?? 0,
    p4: v[3] ?? 0,
    p5: v[4] ?? 0,
    p6: v[5] ?? 0,
  }
}

function deriveUnitPrices(input: {
  powerCostEur?: number
  energyCostEur?: number
  invoiceDays?: number
  potencias: ReturnType<typeof periodArrayToRecord>
  consumos: ReturnType<typeof periodArrayToRecord>
}): {
  preciosPotencia?: ComparadorInvoiceExtraction["preciosPotenciaEur"]
  preciosEnergia?: ComparadorInvoiceExtraction["preciosEnergiaEur"]
} {
  const days = input.invoiceDays && input.invoiceDays > 0 ? input.invoiceDays : 30
  const preciosPotencia = periodArrayToRecord()
  const preciosEnergia = periodArrayToRecord()

  if (input.powerCostEur && input.powerCostEur > 0) {
    const slots = (["p1", "p2", "p3", "p4", "p5", "p6"] as const).filter(
      (s) => input.potencias[s] > 0
    )
    const denom = slots.reduce((acc, s) => acc + input.potencias[s] * days, 0)
    if (denom > 0) {
      const unit = input.powerCostEur / denom
      for (const s of slots) preciosPotencia[s] = unit
    }
  }

  if (input.energyCostEur && input.energyCostEur > 0) {
    const slots = (["p1", "p2", "p3", "p4", "p5", "p6"] as const).filter(
      (s) => input.consumos[s] > 0
    )
    const totalKwh = slots.reduce((acc, s) => acc + input.consumos[s], 0)
    if (totalKwh > 0) {
      const unit = input.energyCostEur / totalKwh
      for (const s of slots) preciosEnergia[s] = unit
    }
  }

  return { preciosPotencia, preciosEnergia }
}

function statedElectricPeaje(value?: string | null): ComparadorAccessTariff | undefined {
  if (!value) return undefined
  const match = value.toUpperCase().replace(",", ".").match(/2\.0\s*TD|3\.0\s*TD|6\.[1-4]\s*TD/)
  return match ? normalizeComparadorAccessTariff(match[0]) : undefined
}

function statedGasPeaje(value?: string | null): ComparadorAccessTariff | undefined {
  if (!value || !/RL\.?\s*[1-5]/i.test(value)) return undefined
  const normalized = normalizeComparadorAccessTariff(value)
  return isComparadorGasPeaje(normalized) ? normalized : undefined
}

function hasPositivePrice(values?: number[]): boolean {
  return (values ?? []).some((value) => value > 0)
}

export function mapInvoiceAiToComparadorExtraction(
  payload: InvoiceAiPublicPayload
): ComparadorInvoiceExtraction {
  const electricPeaje =
    statedElectricPeaje(payload.electricityCategory) ?? statedElectricPeaje(payload.tariffType)
  const gasPeaje = statedGasPeaje(payload.gasCategory)
  const tipo = electricPeaje
    ? "luz"
    : gasPeaje
      ? "gas"
      : payload.supplyType === "luz" || payload.billCategory === "luz"
        ? "luz"
        : payload.supplyType === "gas" || payload.billCategory === "gas"
          ? "gas"
          : undefined
  const isGas = tipo === "gas"

  const potencias = periodArrayToRecord(payload.powerKwByPeriod)
  let consumos = periodArrayToRecord(payload.energyKwhByPeriod)
  if (isGas && (payload.gasConsumoKwh ?? 0) > 0 && Object.values(consumos).every((value) => value <= 0)) {
    consumos = { ...consumos, p1: payload.gasConsumoKwh ?? 0 }
  }

  const accessTariff = isGas ? gasPeaje : electricPeaje

  const totalKwh = Object.values(consumos).reduce((a, b) => a + b, 0)
  const invoiceDays = payload.invoiceDays
  const derivedPrices = deriveUnitPrices({
    powerCostEur: isGas ? undefined : payload.powerCostEur,
    energyCostEur: isGas ? undefined : payload.energyCostEur,
    invoiceDays,
    potencias,
    consumos,
  })
  const preciosPotencia = hasPositivePrice(payload.powerPriceEurKwDayByPeriod)
    ? periodArrayToRecord(payload.powerPriceEurKwDayByPeriod)
    : derivedPrices.preciosPotencia
  const preciosEnergia = hasPositivePrice(payload.energyPriceEurKwhByPeriod)
    ? periodArrayToRecord(payload.energyPriceEurKwhByPeriod)
    : derivedPrices.preciosEnergia
  if (isGas && preciosPotencia && (payload.gasTerminoFijoEurDia ?? 0) > 0) {
    preciosPotencia.p1 = payload.gasTerminoFijoEurDia ?? 0
  }
  if (isGas && preciosEnergia && (payload.gasPrecioVariableEurKwh ?? 0) > 0) {
    preciosEnergia.p1 = payload.gasPrecioVariableEurKwh ?? 0
  }

  let facturaImporteEur = payload.totalAmountEur
  let facturaEsMensual = true
  if (facturaImporteEur && invoiceDays && invoiceDays !== 30) {
    facturaEsMensual = false
  }

  const extraServicesTotal = Array.isArray(payload.extraServices)
    ? payload.extraServices.reduce((acc, item) => acc + (item.costEur ?? 0), 0)
    : 0
  const gasServices =
    (payload.gasOtrosServiciosEur ?? 0) + (payload.gasOtrosConceptosEur ?? 0)

  const rawOtherCosts = (payload.otherCosts ?? 0) + extraServicesTotal + gasServices
  const otherCosts = sanitizeAiOtherCosts(
    rawOtherCosts > 0 ? rawOtherCosts : undefined,
    facturaImporteEur,
    extraServicesTotal
  )

  const statedSegment =
    payload.segment === "pyme" ? "pyme" : payload.segment === "residencial" ? "residencial" : undefined
  const segment = resolveInvoiceSegment({
    nif: payload.holderNif,
    tipo,
    accessTariff,
    current: statedSegment,
  })

  return {
    cups: payload.cups,
    compania: payload.companyBrand,
    tarifa: isGas ? payload.gasCategory ?? payload.tariffType : payload.electricityCategory ?? payload.tariffType,
    tipo,
    segment,
    accessTariff,
    potenciasKw: potencias,
    consumosKwh: consumos,
    diasFacturados: invoiceDays,
    preciosPotenciaEur: preciosPotencia,
    preciosEnergiaEur: preciosEnergia,
    meterRentalAmount: payload.meterRentalAmount,
    socialBonusCostEur: payload.socialBonusCostEur,
    financingSocialBonusAmount: payload.financingSocialBonusAmount,
    otherCosts,
    facturaImporteEur,
    facturaEsMensual,
    consumoAnualKwh:
      totalKwh > 0 && invoiceDays
        ? Math.round((totalKwh / invoiceDays) * 365)
        : totalKwh > 0
          ? Math.round(totalKwh * (365 / 30))
          : undefined,
    electricityTaxRegime: payload.electricityTaxRegime,
    consumptionFromProfile: payload.consumptionFromProfile,
    nif: payload.holderNif,
    iban: payload.iban,
    source: "invoice-ai",
    gasConsumoKwh: finiteOrUndefined(payload.gasConsumoKwh),
    gasPrecioVariableEurKwh: finiteOrUndefined(payload.gasPrecioVariableEurKwh),
    gasTerminoFijoEurDia: finiteOrUndefined(payload.gasTerminoFijoEurDia),
    gasTerminoFijoEurTotal: finiteOrUndefined(payload.gasTerminoFijoEurTotal),
    gasIhcCantidadKwh: finiteOrUndefined(payload.gasIhcCantidadKwh),
    gasIhcPrecioEurKwh: finiteOrUndefined(payload.gasIhcPrecioEurKwh),
    gasIhcTotalEur: finiteOrUndefined(payload.gasIhcTotalEur),
    gasTasasEspecialesEur: finiteOrUndefined(payload.gasTasasEspecialesEur),
    gasCanonIrcEur: finiteOrUndefined(payload.gasCanonIrcEur),
    gasOtrosServiciosEur: finiteOrUndefined(payload.gasOtrosServiciosEur),
    gasOtrosConceptosEur: finiteOrUndefined(payload.gasOtrosConceptosEur),
    gasImpuestoIndirectoPct: finiteOrUndefined(payload.gasImpuestoIndirectoPct),
  }
}

function finiteOrUndefined(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
