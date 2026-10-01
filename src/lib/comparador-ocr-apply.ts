import type { CompProposalFilterId } from "./comparador-proposal-filters"
import { normalizeComparadorDiasFacturacion } from "./comparador-billing"
import type { ComparadorInvoiceExtraction } from "./comparador-invoice-extraction"
import { normalizeComparadorAccessTariff } from "./comparador-access-tariff"
import type { ComparadorAccessTariff } from "./erp/comparador-rates"

export interface ComparadorOcrApplyTarget {
  setCompCups: (value: string) => void
  setCompTipo: (value: "luz" | "gas") => void
  setCompCompaniaActual: (value: string) => void
  setCompTarifaActual: (value: string) => void
  setCompAccessTariff: (value: ComparadorAccessTariff) => void
  setCompSegment?: (value: "residencial" | "pyme") => void
  setCompPotencias: (value: {
    p1: number
    p2: number
    p3: number
    p4: number
    p5: number
    p6: number
  }) => void
  setCompConsumos: (value: {
    p1: number
    p2: number
    p3: number
    p4: number
    p5: number
    p6: number
  }) => void
  setCompPreciosPotenciaActual?: (value: {
    p1: number
    p2: number
    p3: number
    p4: number
    p5: number
    p6: number
  }) => void
  setCompPreciosEnergiaActual?: (value: {
    p1: number
    p2: number
    p3: number
    p4: number
    p5: number
    p6: number
  }) => void
  setCompCurrentBill: (value: number) => void
  setCompConsumoAnualKwh?: (value: number) => void
  setCompDiasFacturados?: (value: number) => void
  setCompRentMeter?: (value: number) => void
  setCompBonoSocial?: (value: number) => void
  setCompOtrosCostesSva?: (value: number) => void
  setCompProposalFilters: (value: CompProposalFilterId[]) => void
}

function distributeConsumoAnual(
  totalKwh: number,
  accessTariff: ComparadorAccessTariff
) {
  if (accessTariff === "2.0TD") {
    return {
      p1: Math.round(totalKwh * 0.35),
      p2: Math.round(totalKwh * 0.3),
      p3: Math.round(totalKwh * 0.35),
      p4: 0,
      p5: 0,
      p6: 0,
    }
  }

  const share = Math.round(totalKwh / 6)
  return { p1: share, p2: share, p3: share, p4: share, p5: share, p6: share }
}

function monthlyFromInvoiceTotal(total: number, days?: number, esMensual?: boolean): number {
  if (days && days >= 28 && days <= 35) return Math.round(total * 100) / 100
  if (esMensual !== false && (!days || days <= 35)) return Math.round(total * 100) / 100
  if (days && days > 0) {
    return Math.round(((total / days) * 30) * 100) / 100
  }
  return Math.round((total / 12) * 100) / 100
}

export function applyComparadorOcrResult(
  ocr: ComparadorInvoiceExtraction,
  target: ComparadorOcrApplyTarget
): number {
  let applied = 0
  let accessTariff: ComparadorAccessTariff = ocr.accessTariff ?? "2.0TD"

  if (ocr.cups) {
    target.setCompCups(ocr.cups)
    applied++
  }

  if (ocr.tipo) {
    target.setCompTipo(ocr.tipo)
    applied++
  }

  if (ocr.segment && target.setCompSegment) {
    target.setCompSegment(ocr.segment)
    applied++
  }

  if (ocr.compania) {
    target.setCompCompaniaActual(ocr.compania)
    applied++
  }

  if (ocr.tarifa) {
    target.setCompTarifaActual(ocr.tarifa)
    applied++
  }

  if (ocr.accessTariff) {
    accessTariff = ocr.accessTariff
    target.setCompAccessTariff(ocr.accessTariff)
    applied++
  } else {
    const text = `${ocr.rawTextPreview ?? ""} ${ocr.tarifa ?? ""}`.toUpperCase()
    if (text.includes("2.0TD") || text.includes("3.0TD") || text.includes("6.")) {
      accessTariff = normalizeComparadorAccessTariff(text) as ComparadorAccessTariff
      target.setCompAccessTariff(accessTariff)
      applied++
    }
  }

  if (ocr.potenciasKw) {
    target.setCompPotencias(ocr.potenciasKw)
    applied++
  } else if (ocr.potenciaContratada) {
    const kw = Number.parseFloat(ocr.potenciaContratada.replace(",", "."))
    if (Number.isFinite(kw) && kw > 0) {
      target.setCompPotencias({
        p1: kw,
        p2: kw,
        p3: 0,
        p4: 0,
        p5: 0,
        p6: 0,
      })
      applied++
    }
  }

  if (ocr.consumosKwh && (ocr.consumosKwh.p1 + ocr.consumosKwh.p2 + ocr.consumosKwh.p3) > 0) {
    target.setCompConsumos(ocr.consumosKwh)
    applied++
  } else if (ocr.consumoAnualKwh && ocr.consumoAnualKwh > 0) {
    target.setCompConsumoAnualKwh?.(ocr.consumoAnualKwh)
    target.setCompConsumos(distributeConsumoAnual(ocr.consumoAnualKwh, accessTariff))
    applied++
  }

  if (ocr.preciosPotenciaEur && target.setCompPreciosPotenciaActual) {
    target.setCompPreciosPotenciaActual(ocr.preciosPotenciaEur)
    applied++
  }
  if (ocr.preciosEnergiaEur && target.setCompPreciosEnergiaActual) {
    target.setCompPreciosEnergiaActual(ocr.preciosEnergiaEur)
    applied++
  }

  if (ocr.diasFacturados && target.setCompDiasFacturados) {
    target.setCompDiasFacturados(normalizeComparadorDiasFacturacion(ocr.diasFacturados))
    applied++
  }

  if (ocr.meterRentalAmount != null && ocr.meterRentalAmount >= 0 && target.setCompRentMeter) {
    const days = ocr.diasFacturados ?? 30
    const monthly =
      days >= 28 && days <= 35
        ? ocr.meterRentalAmount
        : (ocr.meterRentalAmount / days) * 30
    target.setCompRentMeter(Math.round(monthly * 100) / 100)
    applied++
  }

  if (ocr.socialBonusCostEur != null && target.setCompBonoSocial) {
    target.setCompBonoSocial(ocr.socialBonusCostEur)
    applied++
  }

  if (ocr.otherCosts != null && ocr.otherCosts > 0 && target.setCompOtrosCostesSva) {
    target.setCompOtrosCostesSva(ocr.otherCosts)
    applied++
  }

  if (ocr.consumoAnualKwh && ocr.consumoAnualKwh > 0) {
    target.setCompConsumoAnualKwh?.(ocr.consumoAnualKwh)
  }

  if (ocr.facturaImporteEur && ocr.facturaImporteEur > 0) {
    target.setCompCurrentBill(
      monthlyFromInvoiceTotal(ocr.facturaImporteEur, ocr.diasFacturados, ocr.facturaEsMensual)
    )
    applied++
  }

  const proposalFilters: CompProposalFilterId[] = []
  if (ocr.tipoPrecio === "fijo") proposalFilters.push("fijo")
  if (ocr.tipoPrecio === "mercado") proposalFilters.push("indexado")
  if (proposalFilters.length > 0) {
    target.setCompProposalFilters(proposalFilters)
    applied++
  }

  return applied
}
