import { normalizeContractEstado, type ContractEstado } from "./contract-estado"

export interface ContractBillingRow {
  comercialId: string
  montoExterno: number
  createdAt: string
  estado: string
  fechaBaja?: string
  retrocomisionClawback?: number
}

export interface BillingEvent {
  date: string
  amount: number
}

const CANCEL_ESTADOS: ContractEstado[] = ["Dado de Baja", "FIRMA CADUCADA"]

/** Eventos de facturación: alta (+montoExterno) y reversión en baja/cancelación. */
export function getContractBillingEvents(contract: ContractBillingRow): BillingEvent[] {
  const events: BillingEvent[] = [
    { date: contract.createdAt, amount: contract.montoExterno },
  ]

  const estado = normalizeContractEstado(contract.estado)
  if (estado === "Dado de Baja") {
    const clawback = contract.retrocomisionClawback ?? 0
    if (clawback > 0) {
      events.push({
        date: contract.fechaBaja ?? contract.createdAt,
        amount: -clawback,
      })
    }
  } else if (estado === "FIRMA CADUCADA") {
    events.push({
      date: contract.createdAt,
      amount: -contract.montoExterno,
    })
  }

  return events
}

export function isContractCancelledOrBaja(estado: string): boolean {
  const normalized = normalizeContractEstado(estado)
  return CANCEL_ESTADOS.includes(normalized)
}

export function getContractFacturadoNet(contract: ContractBillingRow): number {
  return getContractBillingEvents(contract).reduce((sum, e) => sum + e.amount, 0)
}

export interface ChartPoint {
  label: string
  value: number
  /** Acumulado en el bucket (para la curva). */
  cumulative: number
}

export function getPeriodLimit(period: string): Date | null {
  const now = new Date()
  const limit = new Date(now)
  if (period === "1d") limit.setDate(now.getDate() - 1)
  else if (period === "1w") limit.setDate(now.getDate() - 7)
  else if (period === "1m") limit.setMonth(now.getMonth() - 1)
  else if (period === "3m") limit.setMonth(now.getMonth() - 3)
  else if (period === "6m") limit.setMonth(now.getMonth() - 6)
  else if (period === "1y") limit.setFullYear(now.getFullYear() - 1)
  else return null
  return limit
}

function inPeriod(dateIso: string, limit: Date | null): boolean {
  if (!limit) return true
  return new Date(dateIso) >= limit
}

function emptyBuckets(labels: string[]): ChartPoint[] {
  return labels.map((label) => ({ label, value: 0, cumulative: 0 }))
}

export function buildFacturadoChartPoints(
  period: string,
  events: BillingEvent[]
): ChartPoint[] {
  const limit = getPeriodLimit(period)
  const rows = events.filter((e) => inPeriod(e.date, limit))
  const now = new Date()

  function bucketPoints(
    labels: string[],
    getSlot: (index: number) => { start: number; end: number }
  ): ChartPoint[] {
    if (rows.length === 0) return emptyBuckets(labels)
    let cumulative = 0
    return labels.map((label, i) => {
      const { start, end } = getSlot(i)
      const value = rows.reduce((sum, e) => {
        const t = new Date(e.date).getTime()
        return t >= start && t < end ? sum + e.amount : sum
      }, 0)
      cumulative += value
      return {
        label,
        value: Number(value.toFixed(2)),
        cumulative: Number(cumulative.toFixed(2)),
      }
    })
  }

  if (period === "1d") {
    const labels = ["08h", "11h", "14h", "17h", "20h", "Ahora"]
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const dayMs = now.getTime() - start.getTime()
    return bucketPoints(labels, (i) => ({
      start: start.getTime() + (dayMs * i) / labels.length,
      end: start.getTime() + (dayMs * (i + 1)) / labels.length,
    }))
  }

  if (period === "1w") {
    const labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    return bucketPoints(labels, (i) => {
      const d = new Date(now)
      d.setDate(now.getDate() - (6 - i))
      d.setHours(0, 0, 0, 0)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      return { start: d.getTime(), end: next.getTime() }
    })
  }

  if (period === "1m") {
    const labels = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"]
    const start = limit ?? new Date(now.getFullYear(), now.getMonth(), 1)
    const span = now.getTime() - start.getTime()
    return bucketPoints(labels, (i) => ({
      start: start.getTime() + (span * i) / labels.length,
      end: start.getTime() + (span * (i + 1)) / labels.length,
    }))
  }

  const monthCount = period === "3m" ? 3 : period === "6m" ? 6 : period === "1y" ? 12 : 6
  const labels: string[] = []
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    labels.push(d.toLocaleDateString("es-ES", { month: "short" }))
  }

  return bucketPoints(labels, (i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - i), 1)
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    return { start: d.getTime(), end: next.getTime() }
  })
}

export function sumFacturadoInPeriod(events: BillingEvent[], period: string): number {
  const limit = getPeriodLimit(period)
  return events
    .filter((e) => inPeriod(e.date, limit))
    .reduce((sum, e) => sum + e.amount, 0)
}

export function countContractsInPeriod(
  contracts: ContractBillingRow[],
  comercialId: string,
  period: string
): number {
  const limit = getPeriodLimit(period)
  return contracts.filter(
    (c) => c.comercialId === comercialId && inPeriod(c.createdAt, limit)
  ).length
}

export function collectBillingEvents(
  contracts: ContractBillingRow[],
  comercialId: string
): BillingEvent[] {
  return contracts
    .filter((c) => c.comercialId === comercialId)
    .flatMap(getContractBillingEvents)
}

export interface SettlementBillingRow {
  comercialId: string
  montoExterno: number
  createdAt: string
}

export function getSettlementBillingEvents(
  settlement: SettlementBillingRow
): BillingEvent[] {
  return [{ date: settlement.createdAt, amount: settlement.montoExterno }]
}

export function collectSettlementBillingEvents(
  settlements: SettlementBillingRow[],
  comercialId: string
): BillingEvent[] {
  return settlements
    .filter((s) => s.comercialId === comercialId)
    .flatMap(getSettlementBillingEvents)
}

export function countSettlementsInPeriod(
  settlements: SettlementBillingRow[],
  comercialId: string,
  period: string
): number {
  const limit = getPeriodLimit(period)
  return settlements.filter(
    (s) => s.comercialId === comercialId && inPeriod(s.createdAt, limit)
  ).length
}
