import { calcularCosteComparadorDesdeTariffPrecios } from "./comparador-billing"
import { allowsComparadorProviderForSegment } from "./comparador-provider-segment"
import {
  isComparadorTariffPricingComplete,
  mergeComparadorTariffPrecios,
} from "./comparador-tariff-pricing"
import type { ComparadorCostExtras, ComparadorPeriodInputs } from "./tarifa-cost-calculator"
import { estimateMarcoCommissionEur } from "./marco-commission"
import type { MarcoRetributivoEntry } from "../data/marco-retributivo-catalog"
import {
  marcoRowToCatalogEntry,
  type MarcoRetributivoRow,
} from "./supabase/marco-retributivo"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"
import type { TariffPreciosPorPeriodo } from "./tarifa-cost-calculator"
import {
  resolveComparadorTariffPricingType,
  type ComparadorTariffPricingType,
} from "./comparador-tariff-pricing-type"

export interface ComparadorEnVivoFormState {
  segmento: "residencial" | "pyme"
  peaje: string
  potencias: Record<"p1" | "p2" | "p3" | "p4" | "p5" | "p6", number | null>
  consumos: Record<"p1" | "p2" | "p3" | "p4" | "p5" | "p6", number | null>
  diasFacturacion: number | null
  alquilerContador: number | null
  bonoSocial: number | null
  energiaReactiva: number | null
  otrosCostesSva: number | null
  companiaActual: string | null
  tipoPrecioFiltro: "fijo" | "indexado" | null
  sinSva: boolean
  soloPotenciaBoe: boolean
}

export interface RankingTarifa {
  tariffId: string
  providerName: string
  tariffName: string
  costeAnual: number
  potenciaAnual: number
  energiaAnual: number
  comisionEstimada: number | null
  atRateId: string | null
  isIndexed: boolean
  pricingType: ComparadorTariffPricingType
  svaPriceMonthly: number | null
  potenciaBoe: boolean | null
  providerLogoUrl: string | null
  precios: TariffPreciosPorPeriodo
  alquilerAnual: number
  extrasAnual: number
}

export interface MarcoRetributivoIndex {
  byAtRateId: Map<string, MarcoRetributivoRow>
  byTariffId: Map<string, MarcoRetributivoRow>
}

export function buildMarcoRetributivoIndex(rows: MarcoRetributivoRow[]): MarcoRetributivoIndex {
  const byAtRateId = new Map<string, MarcoRetributivoRow>()
  const byTariffId = new Map<string, MarcoRetributivoRow>()

  for (const row of rows) {
    if (row.at_rate_id) byAtRateId.set(row.at_rate_id, row)
    if (row.tariff_id) byTariffId.set(row.tariff_id, row)
  }

  return { byAtRateId, byTariffId }
}

function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase()
}

function resolveMarcoForTariff(
  tariff: TariffConPrecios,
  index: MarcoRetributivoIndex
): MarcoRetributivoRow | null {
  if (tariff.atRateId && index.byAtRateId.has(tariff.atRateId)) {
    return index.byAtRateId.get(tariff.atRateId) ?? null
  }
  if (index.byTariffId.has(tariff.tariffId)) {
    return index.byTariffId.get(tariff.tariffId) ?? null
  }
  return null
}

function matchesTipoPrecioFiltro(tariff: TariffConPrecios, filtro: "fijo" | "indexado" | null): boolean {
  if (!filtro) return true
  return resolveComparadorTariffPricingType(tariff) === filtro
}

function matchesSinSvaFilter(tariff: TariffConPrecios, sinSva: boolean): boolean {
  if (!sinSva) return true
  return (tariff.svaPriceMonthly ?? 0) <= 0
}

function matchesPotenciaBoeFilter(
  marco: MarcoRetributivoRow | null,
  soloPotenciaBoe: boolean
): boolean {
  if (!soloPotenciaBoe) return true
  if (!marco) return false
  return Boolean(marco.potencia_boe)
}

function sumConsumoAnual(form: ComparadorEnVivoFormState): number {
  const consumoMensual = Object.values(form.consumos).reduce(
    (sum, value) => sum + (value != null && value > 0 ? Number(value) : 0),
    0
  )
  return consumoMensual * 12
}

export interface BuildComparadorRankingInput {
  catalog: TariffConPrecios[]
  marcoRows: MarcoRetributivoRow[]
  form: ComparadorEnVivoFormState
  commissionPercentage?: number
  formatCurrency?: (value: number) => string
}

export interface BuildComparadorRankingResult {
  resultados: RankingTarifa[]
  precision: "exacto" | "estimado"
}

export function buildComparadorEnVivoRanking(
  input: BuildComparadorRankingInput
): BuildComparadorRankingResult {
  const {
    catalog,
    marcoRows,
    form,
    commissionPercentage = 100,
    formatCurrency = (value) => `${value.toFixed(2)} €`,
  } = input

  const marcoIndex = buildMarcoRetributivoIndex(marcoRows)
  const currentCompany = form.companiaActual?.trim()
    ? normalizeCompanyName(form.companiaActual)
    : null

  const periodInputs: ComparadorPeriodInputs = {
    potencias: form.potencias,
    consumos: form.consumos,
  }

  const extras: ComparadorCostExtras = {
    alquilerContador: form.alquilerContador,
    bonoSocial: form.bonoSocial,
    energiaReactiva: form.energiaReactiva,
    otrosCostesSva: form.otrosCostesSva,
    diasFacturacion: form.diasFacturacion,
  }

  const consumoAnual = sumConsumoAnual(form)
  let precision: "exacto" | "estimado" = "exacto"
  const resultados: RankingTarifa[] = []

  for (const tariff of catalog) {
    if (currentCompany && normalizeCompanyName(tariff.providerName) === currentCompany) {
      continue
    }

    if (tariff.segment !== form.segmento) continue
    if (!allowsComparadorProviderForSegment(tariff.providerName, form.segmento)) continue

    if (!matchesTipoPrecioFiltro(tariff, form.tipoPrecioFiltro)) continue
    if (!matchesSinSvaFilter(tariff, form.sinSva)) continue

    const marco = resolveMarcoForTariff(tariff, marcoIndex)
    if (!matchesPotenciaBoeFilter(marco, form.soloPotenciaBoe)) continue

    if (
      !isComparadorTariffPricingComplete(
        periodInputs,
        form.peaje,
        tariff.precios,
        marco
      )
    ) {
      continue
    }

    const precios = mergeComparadorTariffPrecios(tariff.precios, marco, form.peaje)

    const { breakdown, precision: rowPrecision } = calcularCosteComparadorDesdeTariffPrecios(
      precios,
      form.peaje,
      periodInputs,
      extras
    )

    if (rowPrecision === "estimado") precision = "estimado"

    let comisionEstimada: number | null = null
    if (marco && consumoAnual > 0) {
      const entry: MarcoRetributivoEntry = marcoRowToCatalogEntry(marco)
      comisionEstimada = estimateMarcoCommissionEur(
        entry,
        commissionPercentage,
        consumoAnual,
        formatCurrency
      ).amountEur
    }

    resultados.push({
      tariffId: tariff.tariffId,
      providerName: tariff.providerName,
      tariffName: tariff.name,
      costeAnual: breakdown.totalAnual,
      potenciaAnual: breakdown.potenciaAnual,
      energiaAnual: breakdown.energiaAnual,
      comisionEstimada,
      atRateId: tariff.atRateId,
      isIndexed: tariff.isIndexed,
      pricingType: resolveComparadorTariffPricingType(tariff),
      svaPriceMonthly: tariff.svaPriceMonthly,
      potenciaBoe: marco?.potencia_boe ?? null,
      providerLogoUrl: tariff.providerLogoUrl,
      precios,
      alquilerAnual: breakdown.alquilerAnual,
      extrasAnual: breakdown.extrasAnual,
    })
  }

  resultados.sort((a, b) => a.costeAnual - b.costeAnual)

  return { resultados, precision }
}
