import type { ContractOcrResult } from "./contract-ocr"

export interface ComparadorOcrApplyTarget {
  setCompCups: (value: string) => void
  setCompTipo: (value: "luz" | "gas") => void
  setCompTarifaActual: (value: string) => void
  setCompAccessTariff: (value: "2.0TD" | "3.0TD" | "6.0TD") => void
  setCompPotencias: (value: {
    p1: number
    p2: number
    p3: number
    p4: number
    p5: number
    p6: number
  }) => void
  setCompProposalFilters: (
    value: import("./comparador-proposal-filters").CompProposalFilterId[]
  ) => void
}

export function applyComparadorOcrResult(
  ocr: ContractOcrResult,
  target: ComparadorOcrApplyTarget
): number {
  let applied = 0

  if (ocr.cups) {
    target.setCompCups(ocr.cups)
    applied++
  }

  if (ocr.tipo) {
    target.setCompTipo(ocr.tipo)
    applied++
  }

  if (ocr.tarifa) {
    target.setCompTarifaActual(ocr.tarifa)
    applied++
  }

  const text = `${ocr.rawTextPreview ?? ""} ${ocr.tarifa ?? ""}`.toUpperCase()
  if (text.includes("6.0TD")) {
    target.setCompAccessTariff("6.0TD")
    applied++
  } else if (text.includes("3.0TD")) {
    target.setCompAccessTariff("3.0TD")
    applied++
  } else if (text.includes("2.0TD")) {
    target.setCompAccessTariff("2.0TD")
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

  const proposalFilters: import("./comparador-proposal-filters").CompProposalFilterId[] = []
  if (ocr.tipoPrecio === "fijo") proposalFilters.push("fijo")
  if (ocr.tipoPrecio === "mercado") proposalFilters.push("indexado")
  if (proposalFilters.length > 0) {
    target.setCompProposalFilters(proposalFilters)
    applied++
  }

  return applied
}
