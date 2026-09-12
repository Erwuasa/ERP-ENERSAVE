import type { ContractOcrResult } from "./contract-ocr"
import type { CompProposalFilterId } from "./comparador-proposal-filters"
import { normalizeComparadorAccessTariff } from "./comparador-access-tariff"
import type { ComparadorAccessTariff } from "./erp/comparador-rates"

export interface ComparadorOcrApplyTarget {
  setCompCups: (value: string) => void
  setCompTipo: (value: "luz" | "gas") => void
  setCompCompaniaActual: (value: string) => void
  setCompTarifaActual: (value: string) => void
  setCompAccessTariff: (value: ComparadorAccessTariff) => void
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
  setCompCurrentBill: (value: number) => void
  setCompProposalFilters: (value: CompProposalFilterId[]) => void
}

function distributeConsumoAnual(
  totalKwh: number,
  accessTariff: ComparadorAccessTariff
): ComparadorOcrApplyTarget["setCompConsumos"] extends (v: infer V) => void ? V : never {
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

export function applyComparadorOcrResult(
  ocr: ContractOcrResult,
  target: ComparadorOcrApplyTarget
): number {
  let applied = 0
  let accessTariff: ComparadorAccessTariff = "2.0TD"

  if (ocr.cups) {
    target.setCompCups(ocr.cups)
    applied++
  }

  if (ocr.tipo) {
    target.setCompTipo(ocr.tipo)
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

  const text = `${ocr.rawTextPreview ?? ""} ${ocr.tarifa ?? ""}`.toUpperCase()
  const detectedAccessTariff = normalizeComparadorAccessTariff(text)
  if (text.includes("2.0TD") || text.includes("3.0TD") || text.includes("6.")) {
    accessTariff = detectedAccessTariff
    target.setCompAccessTariff(detectedAccessTariff)
    applied++
  }

  if (ocr.potenciaContratada) {
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

  if (ocr.consumoAnualKwh && ocr.consumoAnualKwh > 0) {
    target.setCompConsumos(distributeConsumoAnual(ocr.consumoAnualKwh, accessTariff))
    applied++
  }

  if (ocr.facturaImporteEur && ocr.facturaImporteEur > 0) {
    const monthly = ocr.facturaEsMensual === false ? ocr.facturaImporteEur / 12 : ocr.facturaImporteEur
    target.setCompCurrentBill(Math.round(monthly * 100) / 100)
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
