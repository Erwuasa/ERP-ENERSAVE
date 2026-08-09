import type {
  EstudioAhorroConjuntoInput,
  EstudioAhorroInput,
  PeriodoTarifa,
  TarifaEstudioAhorro,
  TerminoEnergiaRow,
  TerminoPotenciaRow,
} from "./estudio-ahorro-types"

const PERIODOS: PeriodoTarifa[] = ["P1", "P2", "P3", "P4", "P5", "P6"]
const DAYS_IN_YEAR = 365
const IVA_PCT = 21

interface PotenciasMap {
  p1: number
  p2: number
  p3: number
  p4: number
  p5: number
  p6: number
}

interface ConsumosMap {
  p1: number
  p2: number
  p3: number
  p4: number
  p5: number
  p6: number
}

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
  accessTariff: "2.0TD" | "3.0TD" | "6.0TD"
  tarifaActualNombre?: string
  comercializadoraActual?: string
  potencias: PotenciasMap
  consumos: ConsumosMap
  rentMeterMonthly: number
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

function potenciaValues(map: PotenciasMap): number[] {
  return [map.p1, map.p2, map.p3, map.p4, map.p5, map.p6]
}

function consumoValues(map: ConsumosMap): number[] {
  return [map.p1, map.p2, map.p3, map.p4, map.p5, map.p6]
}

function activePeriodCount(accessTariff: string): number {
  if (accessTariff === "2.0TD") return 3
  return 6
}

function buildTerminoPotencia(
  potencias: number[],
  potRates: number[],
  accessTariff: string
): TerminoPotenciaRow[] {
  const count = activePeriodCount(accessTariff)
  return PERIODOS.slice(0, count).map((periodo, idx) => {
    const kw = potencias[idx] ?? 0
    const rate = potRates[idx] ?? 0
    const total = kw * rate * DAYS_IN_YEAR
    return {
      periodo,
      potenciaContratadaKw: kw,
      precioEurDia: rate,
      total,
    }
  })
}

function buildTerminoEnergia(
  consumos: number[],
  conRates: number[],
  accessTariff: string
): TerminoEnergiaRow[] {
  const count = activePeriodCount(accessTariff)
  return PERIODOS.slice(0, count).map((periodo, idx) => {
    const kwh = consumos[idx] ?? 0
    const rate = conRates[idx] ?? 0
    const total = kwh * rate
    return {
      periodo,
      consumoKwh: kwh,
      precioEurKwh: rate,
      total,
    }
  })
}

function getDefaultRates(accessTariff: string): { potRates: number[]; conRates: number[] } {
  if (accessTariff === "2.0TD") {
    return {
      potRates: [0.085, 0.028, 0, 0, 0, 0],
      conRates: [0.172, 0.152, 0.128, 0, 0, 0],
    }
  }
  if (accessTariff === "3.0TD") {
    return {
      potRates: [0.112, 0.092, 0.05, 0.042, 0.026, 0.017],
      conRates: [0.148, 0.136, 0.12, 0.112, 0.105, 0.094],
    }
  }
  return {
    potRates: [0.108, 0.088, 0.048, 0.04, 0.023, 0.015],
    conRates: [0.128, 0.115, 0.106, 0.098, 0.09, 0.08],
  }
}

function scaleRatesToTargetAnnual(
  potencias: number[],
  consumos: number[],
  potRates: number[],
  conRates: number[],
  rentAnnual: number,
  targetAnnual: number,
  accessTariff: string
): { potRates: number[]; conRates: number[] } {
  const potRows = buildTerminoPotencia(potencias, potRates, accessTariff)
  const eneRows = buildTerminoEnergia(consumos, conRates, accessTariff)
  const subtotal = potRows.reduce((a, r) => a + r.total, 0) + eneRows.reduce((a, r) => a + r.total, 0) + rentAnnual
  if (subtotal <= 0 || targetAnnual <= 0) return { potRates, conRates }
  const factor = (targetAnnual - rentAnnual) / Math.max(subtotal - rentAnnual, 1)
  return {
    potRates: potRates.map((r) => r * factor),
    conRates: conRates.map((r) => r * factor),
  }
}

function buildTarifa(
  comercializadora: string,
  nombreTarifa: string,
  potencias: number[],
  consumos: number[],
  potRates: number[],
  conRates: number[],
  rentAnnual: number,
  accessTariff: string,
  targetAnnual?: number
): TarifaEstudioAhorro {
  let rates = { potRates, conRates }
  if (targetAnnual != null && targetAnnual > 0) {
    rates = scaleRatesToTargetAnnual(
      potencias,
      consumos,
      potRates,
      conRates,
      rentAnnual,
      targetAnnual,
      accessTariff
    )
  }

  const terminoPotencia = buildTerminoPotencia(potencias, rates.potRates, accessTariff)
  const terminoEnergia = buildTerminoEnergia(consumos, rates.conRates, accessTariff)
  const potenciaTotal = terminoPotencia.reduce((a, r) => a + r.total, 0)
  const energiaTotal = terminoEnergia.reduce((a, r) => a + r.total, 0)
  const baseImponible = potenciaTotal + energiaTotal + rentAnnual
  const iva = baseImponible * (IVA_PCT / 100)
  const totalFactura = baseImponible + iva

  return {
    comercializadora,
    nombreTarifa,
    terminoPotencia,
    terminoEnergia,
    otrosConceptos: rentAnnual > 0
      ? [{ concepto: "Alquiler equipo", precio: rentAnnual / 12, total: rentAnnual }]
      : [],
    ivaPct: IVA_PCT,
    totalFactura,
  }
}

function inferCompanyFromTariffName(tariffName: string): string {
  const lower = tariffName.toLowerCase()
  if (lower.includes("enerluz") || lower.includes("enersave")) return "EnerLuz"
  if (lower.includes("iberdrola")) return "Iberdrola"
  if (lower.includes("endesa")) return "Endesa"
  if (lower.includes("naturgy")) return "Naturgy"
  if (lower.includes("repsol")) return "Repsol"
  if (lower.includes("axpo")) return "Axpo"
  return "Comercializadora"
}

export function mapComparadorToEstudioAhorro(
  params: MapComparadorEstudioAhorroParams
): EstudioAhorroInput {
  const potencias = potenciaValues(params.potencias)
  const consumos = consumoValues(params.consumos)
  const rentAnnual = params.rentMeterMonthly * 12
  const currentAnnual =
    params.currentBillMonthly > 0
      ? params.currentBillMonthly * 12
      : params.summary.currentAnnualExpense

  const currentDefaults = getDefaultRates(params.accessTariff)
  const currentPotRates = currentDefaults.potRates.map((r) => r * 1.12)
  const currentConRates = currentDefaults.conRates.map((r) => r * 1.12)

  const proposedPotRates = params.bestOption.potRates ?? currentDefaults.potRates
  const proposedConRates = params.bestOption.conRates ?? currentDefaults.conRates

  const tarifaActual = buildTarifa(
    params.comercializadoraActual ?? "Comercializadora actual",
    params.tarifaActualNombre ?? "Tarifa actual",
    potencias,
    consumos,
    currentPotRates,
    currentConRates,
    rentAnnual,
    params.accessTariff,
    currentAnnual
  )

  const tarifaPropuesta = buildTarifa(
    params.bestOption.companyName,
    params.bestOption.tariffName,
    potencias,
    consumos,
    proposedPotRates,
    proposedConRates,
    rentAnnual,
    params.accessTariff,
    params.bestOption.annualCost
  )

  const ahorroPorFacturaEur = Math.max(0, tarifaActual.totalFactura - tarifaPropuesta.totalFactura)
  const ahorroPorFacturaPct =
    tarifaActual.totalFactura > 0
      ? (ahorroPorFacturaEur / tarifaActual.totalFactura) * 100
      : 0
  const ahorroAnualEur = Math.max(0, params.summary.maxAnnualSavings)
  const ahorroAnualPct =
    currentAnnual > 0 ? (ahorroAnualEur / currentAnnual) * 100 : params.summary.maxSavingsPercentage

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
  const accessTariff = params.accessTariff as "2.0TD" | "3.0TD" | "6.0TD"
  const defaults = getDefaultRates(accessTariff)
  const potencias =
    accessTariff === "2.0TD"
      ? { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 }
      : { p1: 15, p2: 15, p3: 10, p4: 10, p5: 5, p6: 5 }
  const consumos =
    accessTariff === "2.0TD"
      ? { p1: 1200, p2: 900, p3: 1500, p4: 0, p5: 0, p6: 0 }
      : { p1: 8000, p2: 7000, p3: 6000, p4: 5000, p5: 4000, p6: 3000 }

  const company = params.bestTariffCompany ?? inferCompanyFromTariffName(params.bestTariffName)
  const proposedAnnual = Math.max(0, params.currentAnnualExpense - params.maxAnnualSavings)
  const savingsPct =
    params.currentAnnualExpense > 0
      ? (params.maxAnnualSavings / params.currentAnnualExpense) * 100
      : 0

  return mapComparadorToEstudioAhorro({
    clienteNombre: params.clientName,
    cups: params.cups,
    accessTariff,
    tarifaActualNombre: "Tarifa actual estimada",
    comercializadoraActual: "Comercializadora actual",
    potencias,
    consumos,
    rentMeterMonthly: 1.84,
    currentBillMonthly: params.currentAnnualExpense / 12,
    bestOption: {
      companyName: company,
      tariffName: params.bestTariffName,
      annualCost: proposedAnnual,
      potenciaBreakdown: 0,
      consumoBreakdown: 0,
      rentCostAnnual: 0,
      savingsAnnual: params.maxAnnualSavings,
      savingsPercentage: savingsPct,
      potRates: defaults.potRates,
      conRates: defaults.conRates,
    },
    summary: {
      bestTariffName: params.bestTariffName,
      bestTariffCompany: company,
      maxAnnualSavings: params.maxAnnualSavings,
      maxSavingsPercentage: savingsPct,
      currentAnnualExpense: params.currentAnnualExpense,
    },
  })
}
