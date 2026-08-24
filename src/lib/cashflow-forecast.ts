import type { Contract } from "../types/contract"
import type { Settlement } from "../types/settlement"
import { isRetrocomisionSettlement } from "./liquidaciones-internas"
import { normalizeTipoClienteSegment } from "./contract-segment-rules"

/** Cobro de comercializadoras a EnerSave */
export const COBRO_COMERCIALIZADORA_DIA_RESIDENCIAL = 9
export const COBRO_COMERCIALIZADORA_DIA_PYME = 22

/** Pago a comerciales (autofactura / liquidación interna) */
export const PAGO_COMERCIAL_DIA_RESIDENCIAL = 6
export const PAGO_COMERCIAL_DIA_PYME = 20

/** Plazo estimado retrocomisiones (días desde alta de liquidación) */
export const RETROCOMISION_PLAZO_DIAS = 45

export const DEFAULT_UMBRAL_LIQUIDEZ = 5_000

export interface GastoFijoMensual {
  concepto: string
  importe: number
  diaDelMes: number
}

export interface CashflowMovimientoEntrada {
  concepto: string
  importe: number
  origen: "liquidacion_comercializadora" | "cobro_pendiente"
}

export interface CashflowMovimientoSalida {
  concepto: string
  importe: number
  origen: "comision_comercial" | "gasto_operativo" | "nomina"
}

export interface SemanaCashflow {
  numeroSemana: number
  fechaInicio: string
  fechaFin: string
  saldoInicial: number
  entradas: CashflowMovimientoEntrada[]
  salidas: CashflowMovimientoSalida[]
  totalEntradas: number
  totalSalidas: number
  saldoFinal: number
  esProyeccion: boolean
}

export type CashflowScenarioShift = "optimista" | "realista" | "pesimista"

export interface CashflowForecastOptions {
  hoy?: Date
  contractsById?: Map<string, Contract>
  settlementsPagados?: Settlement[]
  scenario?: CashflowScenarioShift
  semanasTotal?: number
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function startOfWeekMonday(date: Date): Date {
  const copy = startOfDay(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return copy
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function isPymeSegment(segment: "residencial" | "pyme" | "autonomo"): boolean {
  return segment === "pyme" || segment === "autonomo"
}

function resolveSettlementSegment(
  settlement: Settlement,
  contractsById?: Map<string, Contract>
): "residencial" | "pyme" | "autonomo" {
  const contract = settlement.contractId ? contractsById?.get(settlement.contractId) : undefined
  if (contract) {
    return normalizeTipoClienteSegment({
      tipoCliente: contract.tipoCliente,
      compania: contract.compania,
      clientName: contract.clientName,
      nif: contract.nif,
    })
  }
  if (/pyme|empresa|industrial|negocio/i.test(settlement.descripcion)) return "pyme"
  return "residencial"
}

/** Próximo día de cobro de comercializadora (mes siguiente al de referencia). */
export function estimateFechaCobroComercializadora(
  settlement: Settlement,
  contractsById?: Map<string, Contract>,
  referenceDate?: string
): string {
  const ref = parseIsoDate(referenceDate ?? settlement.createdAt)
  const segment = resolveSettlementSegment(settlement, contractsById)
  const targetDay = isPymeSegment(segment)
    ? COBRO_COMERCIALIZADORA_DIA_PYME
    : COBRO_COMERCIALIZADORA_DIA_RESIDENCIAL

  const month = ref.getMonth() + 1
  const year = ref.getFullYear()
  return toIsoDate(new Date(year, month, targetDay))
}

/** Próximo día de pago al comercial (mes siguiente al de referencia). */
export function estimateFechaPagoComercial(
  settlement: Settlement,
  contractsById?: Map<string, Contract>,
  referenceDate?: string
): string {
  const ref = parseIsoDate(referenceDate ?? settlement.createdAt)
  const segment = resolveSettlementSegment(settlement, contractsById)
  const targetDay = isPymeSegment(segment)
    ? PAGO_COMERCIAL_DIA_PYME
    : PAGO_COMERCIAL_DIA_RESIDENCIAL

  const month = ref.getMonth() + 1
  const year = ref.getFullYear()
  return toIsoDate(new Date(year, month, targetDay))
}

export function estimateFechaRetrocomision(settlement: Settlement): string {
  const ref = parseIsoDate(settlement.createdAt)
  return toIsoDate(addDays(ref, RETROCOMISION_PLAZO_DIAS))
}

function applyScenarioDateShift(iso: string, scenario: CashflowScenarioShift, kind: "cobro" | "pago"): string {
  if (scenario === "realista") return iso
  const date = parseIsoDate(iso)
  if (scenario === "optimista") {
    date.setDate(date.getDate() + (kind === "cobro" ? -5 : 5))
  } else {
    date.setDate(date.getDate() + (kind === "cobro" ? 7 : -3))
  }
  return toIsoDate(date)
}

function buildWeekWindows(hoy: Date, totalWeeks: number): Omit<SemanaCashflow, "saldoInicial" | "entradas" | "salidas" | "totalEntradas" | "totalSalidas" | "saldoFinal">[] {
  const today = startOfDay(hoy)
  const currentMonday = startOfWeekMonday(today)
  // 3 semanas históricas + semana en curso + 12 futuras = 16 semanas (13-week style extendido)
  const historicalWeeks = 3
  const firstMonday = addDays(currentMonday, -7 * historicalWeeks)

  return Array.from({ length: totalWeeks }, (_, index) => {
    const fechaInicio = addDays(firstMonday, index * 7)
    const fechaFin = addDays(fechaInicio, 6)
    const esProyeccion = fechaFin.getTime() >= today.getTime()

    return {
      numeroSemana: index + 1,
      fechaInicio: toIsoDate(fechaInicio),
      fechaFin: toIsoDate(fechaFin),
      esProyeccion,
    }
  })
}

function dateInWeek(iso: string, fechaInicio: string, fechaFin: string, minDate?: Date): boolean {
  const t = parseIsoDate(iso).getTime()
  const start = parseIsoDate(fechaInicio).getTime()
  const end = parseIsoDate(fechaFin).getTime()
  if (t < start || t > end) return false
  if (minDate && t < startOfDay(minDate).getTime()) return false
  return true
}

function sumEntradas(entradas: CashflowMovimientoEntrada[]): number {
  return entradas.reduce((sum, item) => sum + item.importe, 0)
}

function sumSalidas(salidas: CashflowMovimientoSalida[]): number {
  return salidas.reduce((sum, item) => sum + item.importe, 0)
}

function pushGastosFijosEnSemana(
  semana: SemanaCashflow,
  gastosFijosMensuales: GastoFijoMensual[],
  hoy: Date
) {
  const monthStarts = new Set<string>()
  const cursor = parseIsoDate(semana.fechaInicio)
  const end = parseIsoDate(semana.fechaFin)
  while (cursor.getTime() <= end.getTime()) {
    monthStarts.add(`${cursor.getFullYear()}-${cursor.getMonth()}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const key of monthStarts) {
    const [yearStr, monthStr] = key.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    for (const gasto of gastosFijosMensuales) {
      const fechaGasto = toIsoDate(new Date(year, month, gasto.diaDelMes))
      const minDate = semana.esProyeccion ? hoy : undefined
      if (!dateInWeek(fechaGasto, semana.fechaInicio, semana.fechaFin, minDate)) continue

      semana.salidas.push({
        concepto: gasto.concepto,
        importe: gasto.importe,
        origen: /nómina|nomina/i.test(gasto.concepto) ? "nomina" : "gasto_operativo",
      })
    }
  }
}

function assignPagadoSettlement(
  semanas: SemanaCashflow[],
  settlement: Settlement,
  hoy: Date
) {
  const fechaMovimiento = settlement.createdAt.slice(0, 10)
  const semana = semanas.find((w) =>
    dateInWeek(fechaMovimiento, w.fechaInicio, w.fechaFin)
  )
  if (!semana) return

  const cobro = settlement.montoInterno ?? 0
  const pago = settlement.montoExterno ?? 0

  if (cobro > 0) {
    semana.entradas.push({
      concepto: settlement.descripcion,
      importe: cobro,
      origen: "cobro_pendiente",
    })
  } else if (cobro < 0) {
    semana.salidas.push({
      concepto: settlement.descripcion,
      importe: Math.abs(cobro),
      origen: "gasto_operativo",
    })
  }

  if (pago > 0) {
    semana.salidas.push({
      concepto: `Pago comercial · ${settlement.comercialName}`,
      importe: pago,
      origen: "comision_comercial",
    })
  } else if (pago < 0) {
    semana.entradas.push({
      concepto: `Retrocomisión · ${settlement.comercialName}`,
      importe: Math.abs(pago),
      origen: "liquidacion_comercializadora",
    })
  }
}

function assignPendienteCobro(
  semanas: SemanaCashflow[],
  settlement: Settlement,
  contractsById: Map<string, Contract> | undefined,
  scenario: CashflowScenarioShift,
  hoy: Date
) {
  const isRetro = isRetrocomisionSettlement(settlement)
  const fechaEstimada = applyScenarioDateShift(
    isRetro ? estimateFechaRetrocomision(settlement) : estimateFechaCobroComercializadora(settlement, contractsById),
    scenario,
    "cobro"
  )

  const semana = semanas.find(
    (w) => w.esProyeccion && dateInWeek(fechaEstimada, w.fechaInicio, w.fechaFin, hoy)
  )
  if (!semana) return

  const importe = Math.abs(settlement.montoInterno ?? 0)
  if (importe <= 0) return

  if ((settlement.montoInterno ?? 0) < 0) {
    semana.salidas.push({
      concepto: settlement.descripcion,
      importe,
      origen: "gasto_operativo",
    })
    return
  }

  semana.entradas.push({
    concepto: settlement.descripcion,
    importe,
    origen: "liquidacion_comercializadora",
  })
}

function assignPendientePago(
  semanas: SemanaCashflow[],
  settlement: Settlement,
  contractsById: Map<string, Contract> | undefined,
  scenario: CashflowScenarioShift,
  hoy: Date
) {
  const isRetro = isRetrocomisionSettlement(settlement)
  const fechaEstimada = applyScenarioDateShift(
    isRetro ? estimateFechaRetrocomision(settlement) : estimateFechaPagoComercial(settlement, contractsById),
    scenario,
    "pago"
  )

  const semana = semanas.find(
    (w) => w.esProyeccion && dateInWeek(fechaEstimada, w.fechaInicio, w.fechaFin, hoy)
  )
  if (!semana) return

  const importe = Math.abs(settlement.montoExterno ?? 0)
  if (importe <= 0) return

  if ((settlement.montoExterno ?? 0) < 0) {
    semana.entradas.push({
      concepto: settlement.descripcion,
      importe,
      origen: "cobro_pendiente",
    })
    return
  }

  semana.salidas.push({
    concepto: `Comisión · ${settlement.comercialName}`,
    importe,
    origen: "comision_comercial",
  })
}

function findCurrentWeekIndex(semanas: SemanaCashflow[], hoy: Date): number {
  const today = startOfDay(hoy).getTime()
  const idx = semanas.findIndex((semana) => {
    const start = parseIsoDate(semana.fechaInicio).getTime()
    const end = parseIsoDate(semana.fechaFin).getTime()
    return today >= start && today <= end
  })
  return idx >= 0 ? idx : 0
}

function encadenarSaldos(semanas: SemanaCashflow[], saldoActual: number, hoy: Date): SemanaCashflow[] {
  if (semanas.length === 0) return semanas

  const currentIdx = findCurrentWeekIndex(semanas, hoy)

  for (const semana of semanas) {
    semana.totalEntradas = sumEntradas(semana.entradas)
    semana.totalSalidas = sumSalidas(semana.salidas)
  }

  semanas[currentIdx].saldoInicial = saldoActual

  for (let i = currentIdx - 1; i >= 0; i -= 1) {
    semanas[i].saldoFinal = semanas[i + 1].saldoInicial
    semanas[i].saldoInicial =
      semanas[i].saldoFinal - semanas[i].totalEntradas + semanas[i].totalSalidas
  }

  for (let i = currentIdx; i < semanas.length; i += 1) {
    semanas[i].saldoFinal =
      semanas[i].saldoInicial + semanas[i].totalEntradas - semanas[i].totalSalidas
    if (i + 1 < semanas.length) {
      semanas[i + 1].saldoInicial = semanas[i].saldoFinal
    }
  }

  return semanas
}

export function partitionSettlementsForCashflow(settlements: Settlement[]) {
  const liquidacionesPendientesCobro = settlements.filter(
    (settlement) => settlement.estado === "pendiente" && (settlement.montoInterno ?? 0) !== 0
  )
  const comisionesPendientesPago = settlements.filter(
    (settlement) =>
      settlement.estado === "pendiente" && (settlement.montoExterno ?? 0) !== 0
  )
  const settlementsPagados = settlements.filter((settlement) => settlement.estado === "pagado")

  return { liquidacionesPendientesCobro, comisionesPendientesPago, settlementsPagados }
}

export function calcularCashflow16Semanas(
  saldoActual: number,
  liquidacionesPendientesCobro: Settlement[],
  comisionesPendientesPago: Settlement[],
  gastosFijosMensuales: GastoFijoMensual[],
  hoy: Date = new Date(),
  options: Omit<CashflowForecastOptions, "hoy"> = {}
): SemanaCashflow[] {
  const totalWeeks = options.semanasTotal ?? 16
  const scenario = options.scenario ?? "realista"
  const contractsById = options.contractsById
  const settlementsPagados = options.settlementsPagados ?? []

  const semanas: SemanaCashflow[] = buildWeekWindows(hoy, totalWeeks).map((window) => ({
    ...window,
    saldoInicial: 0,
    entradas: [],
    salidas: [],
    totalEntradas: 0,
    totalSalidas: 0,
    saldoFinal: 0,
  }))

  for (const settlement of settlementsPagados) {
    assignPagadoSettlement(semanas, settlement, hoy)
  }

  for (const settlement of liquidacionesPendientesCobro) {
    assignPendienteCobro(semanas, settlement, contractsById, scenario, hoy)
  }

  for (const settlement of comisionesPendientesPago) {
    assignPendientePago(semanas, settlement, contractsById, scenario, hoy)
  }

  for (const semana of semanas) {
    pushGastosFijosEnSemana(semana, gastosFijosMensuales, hoy)
  }

  return encadenarSaldos(semanas, saldoActual, hoy)
}

export function findSemanasEnRiesgo(
  semanas: SemanaCashflow[],
  umbralLiquidez = DEFAULT_UMBRAL_LIQUIDEZ
): SemanaCashflow[] {
  return semanas.filter(
    (semana) => semana.saldoFinal < 0 || semana.saldoFinal < umbralLiquidez
  )
}

export function buildContractsById(contracts: Contract[]): Map<string, Contract> {
  return new Map(contracts.map((contract) => [contract.id, contract]))
}

export const DEFAULT_GASTOS_FIJOS_MENSUALES: GastoFijoMensual[] = [
  { concepto: "Nóminas equipo comercial", importe: 8_800, diaDelMes: 3 },
  { concepto: "Nóminas administración y tramitación", importe: 5_200, diaDelMes: 3 },
  { concepto: "Alquiler oficina", importe: 2_100, diaDelMes: 1 },
  { concepto: "Software y herramientas", importe: 890, diaDelMes: 15 },
  { concepto: "Seguros y compliance", importe: 640, diaDelMes: 20 },
]
