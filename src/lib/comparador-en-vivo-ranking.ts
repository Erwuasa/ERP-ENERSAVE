import { calcularCosteComparadorDesdeTariffPrecios } from "./comparador-billing"
import {
  buildMarcoCommissionPools,
  resolveComparadorConsumoAnualKwh,
  resolveComparadorOfferCommission,
} from "./comparador-marco-commission"
import { allowsComparadorProviderForSegment } from "./comparador-provider-segment"
import { normalizeCompaniaKey, resolveCompaniaLogoKey } from "./erp/compania-logos"
import { normalizeSegmento } from "./supabase/marco-retributivo"
import {
  isComparadorTariffPricingComplete,
  mergeComparadorTariffPrecios,
} from "./comparador-tariff-pricing"
import type { ComparadorCostExtras, ComparadorPeriodInputs } from "./tarifa-cost-calculator"
import { tariffMatchesComparadorAccessTariff } from "./comparador-access-tariff"
import { filterCatalogForComparador } from "./comparador-catalog-marco"
import {
  inferIncluyeSvaFromMarcoText,
  inferPotenciaBoeFromMarcoText,
} from "./marco-comparador-meta"
import {
  resolveMarcoForComparadorCommission,
  resolveMarcoForComparadorTariff,
} from "./comparador-marco-resolver"
import type { MarcoTramoPrecision } from "./marco-consumo-tramo"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"
import type { TariffPreciosPorPeriodo } from "./tarifa-cost-calculator"
import {
  resolveComparadorTariffPricingType,
  type ComparadorTariffPricingType,
} from "./comparador-tariff-pricing-type"
import { applyComparadorEnVivoUsageFallbacks } from "./comparador-en-vivo-form"
import { hasComparadorUserProvidedData } from "./comparador-user-input"

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
  /** kWh/año para tramos de comisión en marco retributivo (prioritario sobre suma de periodos). */
  consumoAnualKwh: number | null
  /** Total factura actual (€/mes) introducido por el usuario. */
  facturaMensual: number | null
}

export interface RankingTarifa {
  tariffId: string
  providerName: string
  tariffName: string
  costeAnual: number
  potenciaAnual: number
  energiaAnual: number
  comisionEstimada: number | null
  comisionPrecision: MarcoTramoPrecision | "sin_consumo"
  comisionTramoLabel: string | null
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
  /** Filas activas agrupadas por segmento + compañía (nombre normalizado o logo). */
  fallbackBySegmentCompany: Map<string, MarcoRetributivoRow[]>
}

function marcoFallbackBucketKey(segment: string, companyKey: string): string {
  return `${segment}|${companyKey}`
}

function pushMarcoFallbackBucket(
  buckets: Map<string, MarcoRetributivoRow[]>,
  segment: string,
  companyKey: string,
  row: MarcoRetributivoRow
): void {
  if (!companyKey) return
  const key = marcoFallbackBucketKey(segment, companyKey)
  const list = buckets.get(key)
  if (list) {
    if (list[list.length - 1] !== row) list.push(row)
    return
  }
  buckets.set(key, [row])
}

export function buildMarcoRetributivoIndex(rows: MarcoRetributivoRow[]): MarcoRetributivoIndex {
  const byAtRateId = new Map<string, MarcoRetributivoRow>()
  const byTariffId = new Map<string, MarcoRetributivoRow>()
  const fallbackBySegmentCompany = new Map<string, MarcoRetributivoRow[]>()

  for (const row of rows) {
    if (row.at_rate_id) byAtRateId.set(row.at_rate_id, row)
    if (row.tariff_id) byTariffId.set(row.tariff_id, row)
    if (!row.activo) continue

    const segment = normalizeSegmento(row.segmento)
    const nameKey = normalizeCompaniaKey(row.compania)
    pushMarcoFallbackBucket(fallbackBySegmentCompany, segment, nameKey, row)
    const logoKey = resolveCompaniaLogoKey(row.compania)
    if (logoKey && logoKey !== nameKey) {
      pushMarcoFallbackBucket(fallbackBySegmentCompany, segment, logoKey, row)
    }
  }

  return { byAtRateId, byTariffId, fallbackBySegmentCompany }
}

function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase()
}

function matchesTipoPrecioFiltro(tariff: TariffConPrecios, filtro: "fijo" | "indexado" | null): boolean {
  if (!filtro) return true
  return resolveComparadorTariffPricingType(tariff) === filtro
}

function tariffIncludesSva(
  tariff: TariffConPrecios,
  marco: MarcoRetributivoRow | null
): boolean {
  if ((tariff.svaPriceMonthly ?? 0) > 0) return true
  if (marco?.incluye_sva) return true
  if (inferIncluyeSvaFromMarcoText(tariff.name, marco?.tarifa ?? "")) return true
  return /\bservicio\b/i.test(tariff.name)
}

function matchesSinSvaFilter(
  tariff: TariffConPrecios,
  marco: MarcoRetributivoRow | null,
  sinSva: boolean
): boolean {
  if (!sinSva) return true
  return !tariffIncludesSva(tariff, marco)
}

function matchesPotenciaBoeFilter(
  marco: MarcoRetributivoRow | null,
  tariff: TariffConPrecios,
  soloPotenciaBoe: boolean
): boolean {
  if (!soloPotenciaBoe) return true
  if (!marco) return false
  if (marco.potencia_boe) return true
  return (
    inferPotenciaBoeFromMarcoText(marco.tarifa, marco.condiciones ?? "") ||
    inferPotenciaBoeFromMarcoText(tariff.name, "")
  )
}

/** @deprecated Usa hasComparadorUserProvidedData */
export function hasComparadorEnVivoUsage(form: ComparadorEnVivoFormState): boolean {
  return hasComparadorUserProvidedData(form)
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

  if (!hasComparadorUserProvidedData(form)) {
    return { resultados: [], precision: "exacto" }
  }

  const usageFallbacks = applyComparadorEnVivoUsageFallbacks(form)
  const formWithFallbacks: ComparadorEnVivoFormState = {
    ...form,
    ...usageFallbacks,
  }

  const marcoIndex = buildMarcoRetributivoIndex(marcoRows)
  const commissionPools = buildMarcoCommissionPools(marcoRows)
  const eligibleCatalog = filterCatalogForComparador(
    catalog,
    marcoRows,
    formWithFallbacks.peaje,
    marcoIndex,
    formWithFallbacks.segmento
  )
  const currentCompany = formWithFallbacks.companiaActual?.trim()
    ? normalizeCompanyName(formWithFallbacks.companiaActual)
    : null

  const periodInputs: ComparadorPeriodInputs = {
    potencias: formWithFallbacks.potencias,
    consumos: formWithFallbacks.consumos,
  }

  const extras: ComparadorCostExtras = {
    alquilerContador: formWithFallbacks.alquilerContador,
    bonoSocial: formWithFallbacks.bonoSocial,
    energiaReactiva: formWithFallbacks.energiaReactiva,
    otrosCostesSva: formWithFallbacks.otrosCostesSva,
    diasFacturacion: formWithFallbacks.diasFacturacion,
  }

  const consumoAnual = resolveComparadorConsumoAnualKwh({
    consumoAnualKwh: formWithFallbacks.consumoAnualKwh,
    consumosMensuales: formWithFallbacks.consumos,
  })
  let precision: "exacto" | "estimado" = "exacto"
  const resultados: RankingTarifa[] = []

  for (const tariff of eligibleCatalog) {
    if (currentCompany && normalizeCompanyName(tariff.providerName) === currentCompany) {
      continue
    }

    if (!tariffMatchesComparadorAccessTariff(tariff.accessTariff, formWithFallbacks.peaje)) {
      continue
    }
    if (!allowsComparadorProviderForSegment(tariff.providerName, formWithFallbacks.segmento)) {
      continue
    }

    if (!matchesTipoPrecioFiltro(tariff, formWithFallbacks.tipoPrecioFiltro)) continue

    const marco = resolveMarcoForComparadorTariff(
      tariff,
      marcoIndex,
      marcoRows,
      formWithFallbacks.peaje,
      formWithFallbacks.segmento
    )
    const ownSegment =
      normalizeSegmento(tariff.segment) === normalizeSegmento(formWithFallbacks.segmento)
    if (!marco && !ownSegment) continue
    if (!matchesSinSvaFilter(tariff, marco, formWithFallbacks.sinSva)) continue
    if (!matchesPotenciaBoeFilter(marco, tariff, formWithFallbacks.soloPotenciaBoe)) continue

    if (
      !isComparadorTariffPricingComplete(
        periodInputs,
        formWithFallbacks.peaje,
        tariff.precios,
        marco
      )
    ) {
      continue
    }

    const precios = mergeComparadorTariffPrecios(
      tariff.precios,
      marco,
      formWithFallbacks.peaje
    )

    const { breakdown, precision: rowPrecision } = calcularCosteComparadorDesdeTariffPrecios(
      precios,
      formWithFallbacks.peaje,
      periodInputs,
      extras
    )

    if (rowPrecision === "estimado") precision = "estimado"

    const marcoCommission = resolveMarcoForComparadorCommission(
      tariff,
      marcoIndex,
      marcoRows,
      formWithFallbacks.peaje,
      formWithFallbacks.segmento,
      marco
    )
    const commissionPoolKey = marcoCommission
      ? `${normalizeCompaniaKey(marcoCommission.compania)}|${normalizeSegmento(marcoCommission.segmento)}|${marcoCommission.tipo}`
      : ""
    const commission = marcoCommission
      ? resolveComparadorOfferCommission({
          marco: marcoCommission,
          marcoRows: commissionPools.get(commissionPoolKey) ?? [marcoCommission],
          consumoAnualKwh: consumoAnual,
          commissionPercentage,
          formatCurrency,
        })
      : consumoAnual <= 0
        ? {
            comisionPercibidaEur: null,
            precision: "sin_consumo" as const,
            tramoLabel: null,
          }
        : {
            comisionPercibidaEur: null,
            precision: "sin_datos" as const,
            tramoLabel: null,
          }

    resultados.push({
      tariffId: tariff.tariffId,
      providerName: tariff.providerName,
      tariffName: tariff.name,
      costeAnual: breakdown.totalAnual,
      potenciaAnual: breakdown.potenciaAnual,
      energiaAnual: breakdown.energiaAnual,
      comisionEstimada: commission.comisionPercibidaEur,
      comisionPrecision: commission.precision,
      comisionTramoLabel: commission.tramoLabel,
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
