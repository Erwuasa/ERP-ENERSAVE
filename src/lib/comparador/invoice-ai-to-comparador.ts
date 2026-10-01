import { normalizeComparadorAccessTariff } from "@/lib/comparador-access-tariff"
import type { ComparadorInvoiceExtraction } from "@/lib/comparador-invoice-extraction"
import { sanitizeAiOtherCosts } from "@/lib/comparador-invoice-billing-merge"
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

export function mapInvoiceAiToComparadorExtraction(
  payload: InvoiceAiPublicPayload
): ComparadorInvoiceExtraction {
  const potencias = periodArrayToRecord(payload.powerKwByPeriod)
  const consumos = periodArrayToRecord(payload.energyKwhByPeriod)
  const accessRaw = payload.electricityCategory ?? payload.tariffType ?? ""
  const accessTariff = normalizeComparadorAccessTariff(String(accessRaw))

  const totalKwh = Object.values(consumos).reduce((a, b) => a + b, 0)
  const invoiceDays = payload.invoiceDays
  const { preciosPotencia, preciosEnergia } = deriveUnitPrices({
    powerCostEur: payload.powerCostEur,
    energyCostEur: payload.energyCostEur,
    invoiceDays,
    potencias,
    consumos,
  })

  let facturaImporteEur = payload.totalAmountEur
  let facturaEsMensual = true
  if (facturaImporteEur && invoiceDays && invoiceDays !== 30) {
    facturaEsMensual = false
  }

  const extraServicesTotal = Array.isArray(payload.extraServices)
    ? payload.extraServices.reduce((acc, item) => acc + (item.costEur ?? 0), 0)
    : 0

  const rawOtherCosts = (payload.otherCosts ?? 0) + extraServicesTotal
  const otherCosts = sanitizeAiOtherCosts(
    rawOtherCosts > 0 ? rawOtherCosts : undefined,
    facturaImporteEur,
    extraServicesTotal
  )

  const segment =
    payload.segment === "pyme" ? "pyme" : payload.segment === "residencial" ? "residencial" : undefined

  const tipo =
    payload.supplyType === "gas" || payload.billCategory === "gas"
      ? "gas"
      : payload.supplyType === "luz" || payload.billCategory === "luz"
        ? "luz"
        : undefined

  return {
    cups: payload.cups,
    compania: payload.companyBrand,
    tarifa: payload.electricityCategory ?? payload.tariffType,
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
  }
}
