import { buildComparadorCandidates } from "../comparador-candidates"
import { matchesCompProposalFilters, type CompProposalFilterId } from "../comparador-proposal-filters"
import { sortComparadorOptions, type ComparadorSortMode } from "../comparador-sort"
import { marcoRowToCatalogEntry, type MarcoRetributivoRow } from "../supabase/marco-retributivo"
import type {
  ComparadorAccessTariff,
  ComparadorPeriodValues,
  ComparadorRateOption,
  ComparadorRateSummary,
} from "./comparador-rates"

const DAYS_IN_YEAR = 365

export interface ComputeComparadorOffersInput {
  accessTariff: ComparadorAccessTariff
  segment: "residencial" | "pyme"
  tipo: "luz" | "gas"
  potencias: ComparadorPeriodValues
  consumos: ComparadorPeriodValues
  rentMeter: number
  currentBill: number
  proposalFilters: CompProposalFilterId[]
  sortMode: ComparadorSortMode
  commissionPercentage: number
  formatCurrency: (val: number) => string
  marcoRows?: MarcoRetributivoRow[]
}

export interface ComputeComparadorOffersResult {
  results: ComparadorRateOption[]
  summary: ComparadorRateSummary | null
}

function annualCostsForProfile(
  accessTariff: ComparadorAccessTariff,
  potencias: ComparadorPeriodValues,
  consumos: ComparadorPeriodValues,
  potRates: number[],
  conRates: number[],
  meterCostAnnual: number
) {
  let potCost = 0
  let conCost = 0

  if (accessTariff === "2.0TD") {
    potCost =
      Number(potencias.p1 || 0) * (potRates[0] ?? 0) * DAYS_IN_YEAR +
      Number(potencias.p2 || 0) * (potRates[1] ?? 0) * DAYS_IN_YEAR
    conCost =
      Number(consumos.p1 || 0) * (conRates[0] ?? 0) +
      Number(consumos.p2 || 0) * (conRates[1] ?? 0) +
      Number(consumos.p3 || 0) * (conRates[2] ?? 0)
  } else {
    potCost =
      Number(potencias.p1 || 0) * (potRates[0] ?? 0) * DAYS_IN_YEAR +
      Number(potencias.p2 || 0) * (potRates[1] ?? 0) * DAYS_IN_YEAR +
      Number(potencias.p3 || 0) * (potRates[2] ?? 0) * DAYS_IN_YEAR +
      Number(potencias.p4 || 0) * (potRates[3] ?? 0) * DAYS_IN_YEAR +
      Number(potencias.p5 || 0) * (potRates[4] ?? 0) * DAYS_IN_YEAR +
      Number(potencias.p6 || 0) * (potRates[5] ?? 0) * DAYS_IN_YEAR
    conCost =
      Number(consumos.p1 || 0) * (conRates[0] ?? 0) +
      Number(consumos.p2 || 0) * (conRates[1] ?? 0) +
      Number(consumos.p3 || 0) * (conRates[2] ?? 0) +
      Number(consumos.p4 || 0) * (conRates[3] ?? 0) +
      Number(consumos.p5 || 0) * (conRates[4] ?? 0) +
      Number(consumos.p6 || 0) * (conRates[5] ?? 0)
  }

  const annualCost = potCost + conCost + meterCostAnnual
  return { potCost, conCost, annualCost, monthlyCost: annualCost / 12 }
}

export function computeComparadorOffers(
  input: ComputeComparadorOffersInput
): ComputeComparadorOffersResult {
  const meterCostAnnual = Number(input.rentMeter || 0) * 12
  const candidateProfiles = buildComparadorCandidates({
    accessTariff: input.accessTariff,
    segment: input.segment,
    tipo: input.tipo,
    marcoRows: input.marcoRows && input.marcoRows.length > 0 ? input.marcoRows : undefined,
  }).filter((profile) => matchesCompProposalFilters(profile, input.proposalFilters))

  if (candidateProfiles.length === 0) {
    return { results: [], summary: null }
  }

  const calculatedOptions = candidateProfiles.map((prof, idx) => {
    const costs = annualCostsForProfile(
      input.accessTariff,
      input.potencias,
      input.consumos,
      prof.potRates,
      prof.conRates,
      meterCostAnnual
    )
    return {
      id: prof.id || `client-tariff-${prof.companyName.toLowerCase()}-${idx}`,
      companyName: prof.companyName,
      tariffName: prof.tariffName,
      monthlyCost: Math.round(costs.monthlyCost),
      annualCost: Math.round(costs.annualCost),
      potenciaBreakdown: Math.round(costs.potCost),
      consumoBreakdown: Math.round(costs.conCost),
      rentCostAnnual: Math.round(meterCostAnnual),
      potRates: prof.potRates,
      conRates: prof.conRates,
      isBestOption: false,
      savingsAnnual: 0,
      savingsPercentage: 0,
    }
  })

  let currentAnnualExpense = 0
  if (input.currentBill && Number(input.currentBill) > 0) {
    currentAnnualExpense = Number(input.currentBill) * 12
  } else {
    const maxVal = Math.max(...calculatedOptions.map((o) => o.annualCost))
    currentAnnualExpense = maxVal * 1.18
  }

  const withSavings = calculatedOptions.map((opt) => {
    const savingsAnnual = currentAnnualExpense - opt.annualCost
    return {
      ...opt,
      savingsAnnual: Math.round(savingsAnnual),
      savingsPercentage: Math.round((savingsAnnual / currentAnnualExpense) * 100),
    }
  })

  const totalConsumoAnual =
    Number(input.consumos.p1 || 0) +
    Number(input.consumos.p2 || 0) +
    Number(input.consumos.p3 || 0) +
    Number(input.consumos.p4 || 0) +
    Number(input.consumos.p5 || 0) +
    Number(input.consumos.p6 || 0)

  const markedOptions = sortComparadorOptions(withSavings, input.sortMode, {
    accessTariff: input.accessTariff,
    commissionPercentage: input.commissionPercentage,
    consumoAnual: totalConsumoAnual,
    formatCurrency: input.formatCurrency,
    catalog: (input.marcoRows ?? []).map(marcoRowToCatalogEntry),
  })

  const topOptions = markedOptions.slice(0, 3)
  const best = topOptions[0]
  if (!best) return { results: [], summary: null }

  return {
    results: topOptions,
    summary: {
      bestTariffName: best.tariffName,
      bestTariffCompany: best.companyName,
      maxAnnualSavings: best.savingsAnnual,
      maxSavingsPercentage: best.savingsPercentage,
      currentAnnualExpense: Math.round(currentAnnualExpense),
    },
  }
}

export type { ComparadorRateOption, ComparadorRateSummary }
