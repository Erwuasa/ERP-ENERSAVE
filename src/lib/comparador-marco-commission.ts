import { normalizeCompaniaKey } from "./erp/compania-logos"
import { areMarcoTarifaNamesSimilar } from "./marco-dedup"
import {
  computeTramoCommissionEur,
  resolveMarcoTramoForConsumo,
  type MarcoTramoPrecision,
} from "./marco-consumo-tramo"
import { estimateMarcoCommissionEur } from "./marco-commission"
import type { MarcoRetributivoEntry } from "@/data/marco-retributivo-catalog"
import {
  marcoRowToCatalogEntry,
  normalizeSegmento,
  type MarcoRetributivoRow,
} from "./supabase/marco-retributivo"

export function resolveComparadorConsumoAnualKwh(input: {
  consumoAnualKwh: number | null | undefined
  consumosMensuales: Record<string, number | null | undefined>
}): number {
  const explicit = Number(input.consumoAnualKwh ?? 0)
  if (Number.isFinite(explicit) && explicit > 0) return explicit

  const monthly = Object.values(input.consumosMensuales).reduce(
    (sum, value) => sum + (value != null && value > 0 ? Number(value) : 0),
    0
  )
  return monthly > 0 ? monthly * 12 : 0
}

function listMarcoCandidatesForCommission(
  anchor: MarcoRetributivoRow,
  marcoRows: MarcoRetributivoRow[]
): MarcoRetributivoEntry[] {
  const companiaKey = normalizeCompaniaKey(anchor.compania)
  return marcoRows
    .filter((row) => {
      if (!row.activo || row.tipo !== anchor.tipo) return false
      if (normalizeCompaniaKey(row.compania) !== companiaKey) return false
      if (normalizeSegmento(row.segmento) !== normalizeSegmento(anchor.segmento)) return false
      return (
        row.tarifa === anchor.tarifa ||
        areMarcoTarifaNamesSimilar(row.tarifa, anchor.tarifa)
      )
    })
    .map(marcoRowToCatalogEntry)
}

export interface ComparadorOfferCommissionResult {
  comisionPercibidaEur: number | null
  precision: MarcoTramoPrecision | "sin_consumo"
  tramoLabel: string | null
}

export function resolveComparadorOfferCommission(input: {
  marco: MarcoRetributivoRow
  marcoRows: MarcoRetributivoRow[]
  consumoAnualKwh: number
  commissionPercentage: number
  formatCurrency: (value: number) => string
}): ComparadorOfferCommissionResult {
  const { marco, marcoRows, consumoAnualKwh, commissionPercentage, formatCurrency } = input

  if (consumoAnualKwh <= 0) {
    return {
      comisionPercibidaEur: null,
      precision: "sin_consumo",
      tramoLabel: null,
    }
  }

  const candidates = listMarcoCandidatesForCommission(marco, marcoRows)
  const resolution = resolveMarcoTramoForConsumo(
    candidates.length > 0 ? candidates : [marcoRowToCatalogEntry(marco)],
    consumoAnualKwh
  )

  const entry = resolution.entry ?? marcoRowToCatalogEntry(marco)

  if (resolution.precision === "exacto") {
    const empresaEur = resolution.comisionMin ?? 0
    const comisionPercibidaEur =
      Math.round(empresaEur * (commissionPercentage / 100) * 100) / 100

    const tramoLabel = resolution.condicionLabel?.trim() || null

    if (comisionPercibidaEur > 0) {
      return { comisionPercibidaEur, precision: "exacto", tramoLabel }
    }

    const fallback = estimateMarcoCommissionEur(
      entry,
      commissionPercentage,
      consumoAnualKwh,
      formatCurrency
    )
    return {
      comisionPercibidaEur: fallback.amountEur,
      precision: "exacto",
      tramoLabel: tramoLabel ?? fallback.detail,
    }
  }

  if (
    resolution.comisionMin != null &&
    resolution.comisionMax != null &&
    entry.comisionTipo === "fija"
  ) {
    const midEmpresa = (resolution.comisionMin + resolution.comisionMax) / 2
    return {
      comisionPercibidaEur:
        Math.round(midEmpresa * (commissionPercentage / 100) * 100) / 100,
      precision: "estimado",
      tramoLabel: resolution.condicionLabel || null,
    }
  }

  const estimated = estimateMarcoCommissionEur(
    entry,
    commissionPercentage,
    consumoAnualKwh,
    formatCurrency
  )

  return {
    comisionPercibidaEur: estimated.amountEur > 0 ? estimated.amountEur : null,
    precision: resolution.precision === "sin_datos" ? "sin_datos" : "estimado",
    tramoLabel: resolution.condicionLabel || estimated.detail || null,
  }
}
