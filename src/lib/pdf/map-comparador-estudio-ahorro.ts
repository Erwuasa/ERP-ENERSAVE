import type { ComparadorAccessTariff } from "@/lib/erp/comparador-rates"
import type { ComparadorPeriodValues } from "@/lib/erp/comparador-rates"
import { normalizeComparadorAccessTariff } from "@/lib/comparador-access-tariff"
import {
  COMPARADOR_MESES_ANUAL,
  calcularCosteComparadorDesdePreciosActuales,
  calcularCosteComparadorDesdeTariffPrecios,
  normalizeComparadorDiasFacturacion,
  type ComparadorBillingBreakdown,
} from "@/lib/comparador-billing"
import {
  activeConsumoPeriodSlots,
  activePotenciaPeriodSlots,
} from "@/lib/comparador-periods"
import type { TariffPeriodKey, TariffPreciosPorPeriodo } from "@/lib/tarifa-cost-calculator"
import { appendIeeIvaOtrosConceptos, COMPARADOR_IVA_PCT } from "../comparador-tax"
import type {
  EstudioAhorroConjuntoInput,
  EstudioAhorroInput,
  PeriodoTarifa,
  TarifaEstudioAhorro,
  TerminoEnergiaRow,
  TerminoPotenciaRow,
} from "./estudio-ahorro-types"

const PERIODOS: PeriodoTarifa[] = ["P1", "P2", "P3", "P4", "P5", "P6"]

export interface ComparadorPdfOption {
  companyName: string
  tariffName: string
  annualCost: number
  potenciaBreakdown: number
  consumoBreakdown: number
  rentCostAnnual: number
  savingsAnnual: number
  savingsPercentage: number
  potRates?: number[]
  conRates?: number[]
  precios?: TariffPreciosPorPeriodo
}

export interface ComparadorPdfSummary {
  bestTariffName: string
  bestTariffCompany: string
  maxAnnualSavings: number
  maxSavingsPercentage: number
  currentAnnualExpense: number
}

export interface MapComparadorEstudioAhorroParams {
  clienteNombre: string
  cups: string
  direccion?: string
  accessTariff: ComparadorAccessTariff | string
  tarifaActualNombre?: string
  comercializadoraActual?: string
  potencias: ComparadorPeriodValues
  consumos: ComparadorPeriodValues
  preciosPotenciaActual?: ComparadorPeriodValues
  preciosEnergiaActual?: ComparadorPeriodValues
  diasFacturacion?: number
  rentMeterMonthly: number
  bonoSocial?: number
  energiaReactiva?: number
  otrosCostesSva?: number
  descuentoPotencia?: number
  descuentoEnergia?: number
  currentBillMonthly: number
  bestOption: ComparadorPdfOption
  summary: ComparadorPdfSummary
}

export interface ComparadorHistoryPdfParams {
  clientName: string
  cups: string
  accessTariff: string
  currentAnnualExpense: number
  maxAnnualSavings: number
  bestTariffName: string
  bestTariffCompany?: string
  date?: string
  snapshot?: MapComparadorEstudioAhorroParams
}

function formatFechaGeneracion(date = new Date()): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function emptyPeriodValues(): ComparadorPeriodValues {
  return { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 }
}

export function rateArraysToPrecios(
  potRates: number[] = [],
  conRates: number[] = []
): TariffPreciosPorPeriodo {
  const precios: TariffPreciosPorPeriodo = {}
  for (let index = 0; index < 6; index += 1) {
    const key = `P${index + 1}` as TariffPeriodKey
    const energyPriceKwh = Number(conRates[index] ?? 0)
    const powerPriceKwDay = Number(potRates[index] ?? 0)
    if (energyPriceKwh > 0 || powerPriceKwDay > 0) {
      precios[key] = { energyPriceKwh, powerPriceKwDay }
    }
  }
  return precios
}

export function resolveOfferPrecios(option: {
  precios?: TariffPreciosPorPeriodo
  potRates?: number[]
  conRates?: number[]
}): TariffPreciosPorPeriodo {
  if (option.precios && Object.keys(option.precios).length > 0) return option.precios
  return rateArraysToPrecios(option.potRates, option.conRates)
}

function buildTerminoPotencia(
  breakdown: ComparadorBillingBreakdown,
  peaje: string
): TerminoPotenciaRow[] {
  return activePotenciaPeriodSlots(peaje).map((slot, _idx, _slots) => {
    const index = Number(slot.slice(1)) - 1
    const kw = breakdown.potencias[index] ?? 0
    const rate = breakdown.potenciaRates[index] ?? 0
    return {
      periodo: PERIODOS[index],
      potenciaContratadaKw: kw,
      precioEurDia: rate,
      total: kw * rate * breakdown.diasFacturacion,
    }
  })
}

function buildTerminoEnergia(
  breakdown: ComparadorBillingBreakdown,
  peaje: string
): TerminoEnergiaRow[] {
  return activeConsumoPeriodSlots(peaje).map((slot) => {
    const index = Number(slot.slice(1)) - 1
    const kwh = breakdown.consumos[index] ?? 0
    const rate = breakdown.energiaRates[index] ?? 0
    return {
      periodo: PERIODOS[index],
      consumoKwh: kwh,
      precioEurKwh: rate,
      total: kwh * rate,
    }
  })
}

interface ComparadorOtrosConceptosInput {
  alquilerContador: number
  bonoSocial: number
  energiaReactiva: number
  otrosCostesSva: number
}

function pushOtroConceptoRow(
  rows: TarifaEstudioAhorro["otrosConceptos"],
  concepto: string,
  importe: number
) {
  if (importe <= 0) return
  rows.push({ concepto, precio: importe, total: importe })
}

function buildOtros(
  extras: ComparadorOtrosConceptosInput,
  options?: { includeOtrosCostes?: boolean }
) {
  const rows: TarifaEstudioAhorro["otrosConceptos"] = []
  pushOtroConceptoRow(rows, "Bono social", extras.bonoSocial)
  pushOtroConceptoRow(rows, "Alquiler equipo", extras.alquilerContador)
  if (options?.includeOtrosCostes !== false) {
    pushOtroConceptoRow(rows, "Costes adicionales", extras.otrosCostesSva)
  }
  pushOtroConceptoRow(rows, "Excesos", extras.energiaReactiva)
  return rows
}

function buildTarifaFromBreakdown(
  comercializadora: string,
  nombreTarifa: string,
  breakdown: ComparadorBillingBreakdown,
  peaje: string,
  extras: ComparadorOtrosConceptosInput,
  options?: {
    includeOtrosCostes?: boolean
    descuentoPotencia?: number
    descuentoEnergia?: number
  }
): TarifaEstudioAhorro {
  const base: TarifaEstudioAhorro = {
    comercializadora,
    nombreTarifa,
    terminoPotencia: buildTerminoPotencia(breakdown, peaje),
    terminoEnergia: buildTerminoEnergia(breakdown, peaje),
    otrosConceptos: buildOtros(extras, options),
    descuentoPotencia: Math.max(0, options?.descuentoPotencia ?? 0) || undefined,
    descuentoEnergia: Math.max(0, options?.descuentoEnergia ?? 0) || undefined,
    ivaPct: COMPARADOR_IVA_PCT,
    totalFactura: breakdown.totalMensual,
  }

  return appendIeeIvaOtrosConceptos(base).tarifa
}

function lumpSumActualTarifa(
  comercializadora: string,
  nombreTarifa: string,
  monthly: number
): TarifaEstudioAhorro {
  return {
    comercializadora,
    nombreTarifa,
    terminoPotencia: [],
    terminoEnergia: [],
    otrosConceptos:
      monthly > 0
        ? [{ concepto: "Factura actual", precio: monthly, total: monthly }]
        : [],
    ivaPct: COMPARADOR_IVA_PCT,
    totalFactura: monthly,
  }
}

export function mapComparadorToEstudioAhorro(
  params: MapComparadorEstudioAhorroParams
): EstudioAhorroInput {
  const peaje = normalizeComparadorAccessTariff(params.accessTariff)
  const dias = normalizeComparadorDiasFacturacion(params.diasFacturacion)
  const extras = {
    alquilerContador: params.rentMeterMonthly,
    bonoSocial: params.bonoSocial ?? 0,
    energiaReactiva: params.energiaReactiva ?? 0,
    otrosCostesSva: params.otrosCostesSva ?? 0,
    diasFacturacion: dias,
  }
  const preciosActualesPotencia = params.preciosPotenciaActual ?? emptyPeriodValues()
  const preciosActualesEnergia = params.preciosEnergiaActual ?? emptyPeriodValues()
  const hasActualPrices = Object.values({
    ...preciosActualesPotencia,
    ...preciosActualesEnergia,
  }).some((value) => Number(value) > 0)

  const actualBreakdown = hasActualPrices
    ? calcularCosteComparadorDesdePreciosActuales(
        params.potencias,
        params.consumos,
        preciosActualesPotencia,
        preciosActualesEnergia,
        peaje,
        params.rentMeterMonthly,
        extras
      )
    : null

  const offerPrecios = resolveOfferPrecios(params.bestOption)
  const { breakdown: proposedBreakdown } = calcularCosteComparadorDesdeTariffPrecios(
    offerPrecios,
    peaje,
    { potencias: params.potencias, consumos: params.consumos },
    extras,
    params.rentMeterMonthly
  )

  const otrosInput: ComparadorOtrosConceptosInput = {
    alquilerContador: extras.alquilerContador,
    bonoSocial: extras.bonoSocial,
    energiaReactiva: extras.energiaReactiva,
    otrosCostesSva: extras.otrosCostesSva,
  }

  const descuentos = {
    descuentoPotencia: params.descuentoPotencia ?? 0,
    descuentoEnergia: params.descuentoEnergia ?? 0,
  }

  const tarifaActual = actualBreakdown
    ? buildTarifaFromBreakdown(
        params.comercializadoraActual ?? "Comercializadora actual",
        params.tarifaActualNombre || "Tarifa actual",
        actualBreakdown,
        peaje,
        otrosInput,
        { includeOtrosCostes: true, ...descuentos }
      )
    : lumpSumActualTarifa(
        params.comercializadoraActual ?? "Comercializadora actual",
        params.tarifaActualNombre || "Tarifa actual",
        params.currentBillMonthly > 0
          ? params.currentBillMonthly
          : params.summary.currentAnnualExpense / COMPARADOR_MESES_ANUAL
      )

  const tarifaPropuesta = buildTarifaFromBreakdown(
    params.bestOption.companyName,
    params.bestOption.tariffName,
    proposedBreakdown,
    peaje,
    otrosInput,
    { includeOtrosCostes: true, ...descuentos }
  )

  const ahorroPorFacturaEur = tarifaActual.totalFactura - tarifaPropuesta.totalFactura
  const ahorroPorFacturaPct =
    tarifaActual.totalFactura > 0
      ? (ahorroPorFacturaEur / tarifaActual.totalFactura) * 100
      : 0
  const ahorroAnualEur = ahorroPorFacturaEur * COMPARADOR_MESES_ANUAL
  const ahorroAnualPct = ahorroPorFacturaPct

  return {
    cliente: {
      nombre: params.clienteNombre || "Cliente",
      cups: params.cups,
      direccion: params.direccion,
    },
    fechaGeneracion: formatFechaGeneracion(),
    tarifaActual,
    tarifaPropuesta,
    ahorroPorFacturaEur,
    ahorroPorFacturaPct,
    ahorroAnualEur,
    ahorroAnualPct,
  }
}

export function mapComparadorHistoryListToEstudioAhorroConjunto(
  items: ComparadorHistoryPdfParams[],
  options?: { titular?: string }
): EstudioAhorroConjuntoInput {
  const estudios = items.map((item) => mapComparadorHistoryToEstudioAhorro(item))
  const titular =
    options?.titular ??
    (new Set(items.map((i) => i.clientName)).size === 1 ? items[0]?.clientName : undefined)

  return {
    fechaGeneracion: formatFechaGeneracion(),
    titular,
    estudios,
  }
}

export function mapComparadorHistoryToEstudioAhorro(
  params: ComparadorHistoryPdfParams
): EstudioAhorroInput {
  if (params.snapshot) {
    return mapComparadorToEstudioAhorro(params.snapshot)
  }

  const accessTariff = normalizeComparadorAccessTariff(params.accessTariff)
  const currentMonthly = params.currentAnnualExpense / COMPARADOR_MESES_ANUAL
  const proposedMonthly = Math.max(
    0,
    (params.currentAnnualExpense - params.maxAnnualSavings) / COMPARADOR_MESES_ANUAL
  )

  return mapComparadorToEstudioAhorro({
    clienteNombre: params.clientName,
    cups: params.cups,
    accessTariff,
    tarifaActualNombre: "Tarifa actual",
    comercializadoraActual: "Comercializadora actual",
    potencias: emptyPeriodValues(),
    consumos: emptyPeriodValues(),
    rentMeterMonthly: 0,
    currentBillMonthly: currentMonthly,
    bestOption: {
      companyName: params.bestTariffCompany ?? "Comercializadora",
      tariffName: params.bestTariffName,
      annualCost: proposedMonthly * COMPARADOR_MESES_ANUAL,
      potenciaBreakdown: 0,
      consumoBreakdown: 0,
      rentCostAnnual: 0,
      savingsAnnual: params.maxAnnualSavings,
      savingsPercentage:
        params.currentAnnualExpense > 0
          ? (params.maxAnnualSavings / params.currentAnnualExpense) * 100
          : 0,
    },
    summary: {
      bestTariffName: params.bestTariffName,
      bestTariffCompany: params.bestTariffCompany ?? "Comercializadora",
      maxAnnualSavings: params.maxAnnualSavings,
      maxSavingsPercentage:
        params.currentAnnualExpense > 0
          ? (params.maxAnnualSavings / params.currentAnnualExpense) * 100
          : 0,
      currentAnnualExpense: params.currentAnnualExpense,
    },
  })
}
