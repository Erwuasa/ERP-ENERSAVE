import type { CompProposalFilterId } from "./comparador-proposal-filters"
import type { ComparadorEnVivoFormState } from "./comparador-en-vivo-ranking"
import { resolveComparadorCurrentBillAnnual } from "./comparador-current-bill"
import type { ComparadorPeriodValues } from "./erp/comparador-rates"
import { normalizePeaje } from "./tarifa-cost-calculator"
import type { ComparadorOfferOption } from "../components/ComparadorOfferCard"
import type { RankingTarifa } from "./comparador-en-vivo-ranking"
import {
  buildComparadorOfferBreakdown,
  type ComparadorOfferBreakdownRow,
} from "./comparador-offer-breakdown"
import {
  COMPARADOR_DIAS_FACTURACION_MENSUAL,
  COMPARADOR_MESES_ANUAL,
  normalizeComparadorDiasFacturacion,
} from "./comparador-billing"
import type { ComparadorSortMode } from "./comparador-sort"

const CONSUMO_SPLIT_20TD = [0.3, 0.25, 0.45, 0, 0, 0]
const CONSUMO_SPLIT_30TD = [0.2, 0.18, 0.16, 0.16, 0.15, 0.15]

const MERCADO_CONSUMO_ANUAL: Record<"residencial" | "pyme", number> = {
  residencial: 3600,
  pyme: 12000,
}

type PeriodSlot = "p1" | "p2" | "p3" | "p4" | "p5" | "p6"
const PERIOD_SLOTS: PeriodSlot[] = ["p1", "p2", "p3", "p4", "p5", "p6"]

function periodValueToNullable(value: number): number | null {
  return value > 0 ? value : null
}

function mapPeriodValues(values: ComparadorPeriodValues): Record<PeriodSlot, number | null> {
  return {
    p1: periodValueToNullable(values.p1),
    p2: periodValueToNullable(values.p2),
    p3: periodValueToNullable(values.p3),
    p4: periodValueToNullable(values.p4),
    p5: periodValueToNullable(values.p5),
    p6: periodValueToNullable(values.p6),
  }
}

export function mapProposalFiltersToEnVivoFilters(filters: CompProposalFilterId[]): Pick<
  ComparadorEnVivoFormState,
  "tipoPrecioFiltro" | "sinSva" | "soloPotenciaBoe"
> {
  const hasFijo = filters.includes("fijo")
  const hasIndexado = filters.includes("indexado")

  let tipoPrecioFiltro: "fijo" | "indexado" | null = null
  if (hasFijo && !hasIndexado) tipoPrecioFiltro = "fijo"
  else if (hasIndexado && !hasFijo) tipoPrecioFiltro = "indexado"

  return {
    tipoPrecioFiltro,
    sinSva: filters.includes("sin_sva"),
    soloPotenciaBoe: filters.includes("potencia_boe"),
  }
}

function withMarketFallbackConsumos(
  consumos: Record<PeriodSlot, number | null>,
  segmento: "residencial" | "pyme",
  peaje: string
): Record<PeriodSlot, number | null> {
  const sum = PERIOD_SLOTS.reduce((total, slot) => total + (consumos[slot] ?? 0), 0)
  if (sum > 0) return consumos

  const consumoMensualTotal = MERCADO_CONSUMO_ANUAL[segmento] / COMPARADOR_MESES_ANUAL
  const split = normalizePeaje(peaje) === "2.0TD" ? CONSUMO_SPLIT_20TD : CONSUMO_SPLIT_30TD
  const periodCount = normalizePeaje(peaje) === "2.0TD" ? 3 : 6
  const next = { ...consumos }

  for (let index = 0; index < periodCount; index += 1) {
    next[PERIOD_SLOTS[index]] = Math.round(consumoMensualTotal * (split[index] ?? 0))
  }

  return next
}

function withDefaultPotencias(
  potencias: Record<PeriodSlot, number | null>,
  peaje: string
): Record<PeriodSlot, number | null> {
  const hasPotencia = PERIOD_SLOTS.some((slot) => (potencias[slot] ?? 0) > 0)
  if (hasPotencia) return potencias

  const defaultKw = normalizePeaje(peaje) === "2.0TD" ? 4.6 : 15
  return {
    ...potencias,
    p1: defaultKw,
    p2: defaultKw,
  }
}

export interface BuildComparadorEnVivoFormInput {
  segmento: "residencial" | "pyme"
  peaje: string
  potencias: ComparadorPeriodValues
  consumos: ComparadorPeriodValues
  diasFacturacion: number
  alquilerContador: number
  bonoSocial: number
  energiaReactiva: number
  otrosCostesSva: number
  companiaActual: string | null
  proposalFilters: CompProposalFilterId[]
}

export function buildComparadorEnVivoFormState(
  input: BuildComparadorEnVivoFormInput
): ComparadorEnVivoFormState {
  const filterFields = mapProposalFiltersToEnVivoFilters(input.proposalFilters)
  const potencias = withDefaultPotencias(mapPeriodValues(input.potencias), input.peaje)
  const consumos = withMarketFallbackConsumos(
    mapPeriodValues(input.consumos),
    input.segmento,
    input.peaje
  )

  return {
    segmento: input.segmento,
    peaje: input.peaje,
    potencias,
    consumos,
    diasFacturacion: normalizeComparadorDiasFacturacion(input.diasFacturacion),
    alquilerContador: input.alquilerContador > 0 ? input.alquilerContador : null,
    bonoSocial: input.bonoSocial > 0 ? input.bonoSocial : null,
    energiaReactiva: input.energiaReactiva > 0 ? input.energiaReactiva : null,
    otrosCostesSva: input.otrosCostesSva > 0 ? input.otrosCostesSva : null,
    companiaActual: input.companiaActual,
    ...filterFields,
  }
}

export interface ComparadorBillExtrasInput {
  rentMeterMonthly: number
  bonoSocial: number
  energiaReactiva: number
  otrosCostesSva: number
}

function sumBillExtrasAnnual(extras: ComparadorBillExtrasInput): number {
  return (
    Math.max(0, extras.rentMeterMonthly) * 12 +
    Math.max(0, extras.bonoSocial) * 12 +
    Math.max(0, extras.energiaReactiva) +
    Math.max(0, extras.otrosCostesSva)
  )
}

export function resolveComparadorCurrentAnnualExpense(
  currentBillMonthly: number,
  options: ComparadorOfferOption[],
  extras: ComparadorBillExtrasInput
): number {
  let base = 0
  if (currentBillMonthly > 0) {
    base = currentBillMonthly * 12
  } else {
    const maxVal = Math.max(...options.map((option) => option.annualCost), 0)
    base = maxVal > 0 ? maxVal * 1.18 : 0
  }

  return base + sumBillExtrasAnnual(extras)
}

export interface MapRankingToOfferOptionsInput {
  resultados: RankingTarifa[]
  peaje: string
  potencias: ComparadorPeriodValues
  consumos: ComparadorPeriodValues
  preciosPotenciaActual: ComparadorPeriodValues
  preciosEnergiaActual: ComparadorPeriodValues
  currentBillMonthly: number
  billExtras: ComparadorBillExtrasInput
  diasFacturacion: number
  sortMode: ComparadorSortMode
}

export interface MapRankingToOfferOptionsResult {
  options: ComparadorOfferOption[]
  currentBillPrecision: "exacto" | "estimado"
}

export function mapRankingToOfferOptions(
  input: MapRankingToOfferOptionsInput
): MapRankingToOfferOptionsResult {
  const {
    resultados,
    peaje,
    potencias,
    consumos,
    preciosPotenciaActual,
    preciosEnergiaActual,
    currentBillMonthly,
    billExtras,
    diasFacturacion,
    sortMode,
  } = input
  const dias = normalizeComparadorDiasFacturacion(diasFacturacion)
  const stubOptions: ComparadorOfferOption[] = resultados.map((row) => ({
    id: row.tariffId,
    companyName: row.providerName,
    tariffName: row.tariffName,
    companyLogoUrl: row.providerLogoUrl,
    monthlyCost: Math.round(row.costeAnual / 12),
    annualCost: Math.round(row.costeAnual),
    potenciaBreakdown: Math.round(row.potenciaAnual ?? 0),
    consumoBreakdown: Math.round(row.energiaAnual ?? 0),
    savingsAnnual: 0,
    savingsPercentage: 0,
    commissionEur: row.comisionEstimada ?? undefined,
    breakdownRows: [],
  }))

  const currentBill = resolveComparadorCurrentBillAnnual({
    peaje,
    potencias,
    consumos,
    preciosPotenciaActual,
    preciosEnergiaActual,
    currentBillMonthly,
    billExtras,
    diasFacturacion: dias,
    fallbackOptions: stubOptions,
  })
  const currentAnnualExpense = currentBill.totalAnual

  const withSavings = resultados.map((row) => {
    const annualCost = Math.round(row.costeAnual)
    const savingsAnnual = currentAnnualExpense - annualCost
    const breakdownRows: ComparadorOfferBreakdownRow[] = buildComparadorOfferBreakdown({
      peaje,
      potencias,
      consumos,
      preciosPotenciaActual,
      preciosEnergiaActual,
      preciosOferta: row.precios ?? {},
      alquilerMensual: Math.round((row.alquilerAnual ?? 0) / COMPARADOR_MESES_ANUAL),
      bonoSocialMensual: billExtras.bonoSocial,
      energiaReactivaMensual: billExtras.energiaReactiva,
      otrosCostesSvaMensual: billExtras.otrosCostesSva,
      totalMensualOferta: Math.round(row.costeAnual / COMPARADOR_MESES_ANUAL),
      totalMensualActual: Math.round(currentAnnualExpense / COMPARADOR_MESES_ANUAL),
      diasFacturacion: dias,
    })

    return {
      id: row.tariffId,
      companyName: row.providerName,
      tariffName: row.tariffName,
      pricingType: row.pricingType,
      companyLogoUrl: row.providerLogoUrl,
      monthlyCost: Math.round(row.costeAnual / 12),
      annualCost,
      potenciaBreakdown: Math.round(row.potenciaAnual ?? 0),
      consumoBreakdown: Math.round(row.energiaAnual ?? 0),
      savingsAnnual: Math.round(savingsAnnual),
      savingsPercentage:
        currentAnnualExpense > 0
          ? Math.round((savingsAnnual / currentAnnualExpense) * 100)
          : 0,
      commissionEur: row.comisionEstimada ?? undefined,
      breakdownRows,
    }
  })

  const sorted = [...withSavings].sort((a, b) => {
    if (sortMode === "comision") {
      const commissionDiff = (b.commissionEur ?? -1) - (a.commissionEur ?? -1)
      if (commissionDiff !== 0) return commissionDiff
    }
    return b.savingsAnnual - a.savingsAnnual
  })

  const topMetric =
    sortMode === "comision" ? sorted[0]?.commissionEur ?? 0 : sorted[0]?.savingsAnnual ?? 0

  return {
    options: sorted.map((option, index) => ({
      ...option,
      isBestOption: index === 0 && topMetric > 0,
    })),
    currentBillPrecision: currentBill.precision,
  }
}
